"""
Spatial Encoder for Multi-Spectral Satellite Imagery.
Processes 4D Tensors (B, T, C, H, W) containing Infrared (10.8µm),
Water Vapor (6.7µm), and Microwave (89GHz) imagery with Spatial Self-Attention
and Grad-CAM hook support.
"""

from typing import Tuple, Optional
import torch
import torch.nn as nn
import torch.nn.functional as F


class SpatialSelfAttention(nn.Module):
    """
    Multi-head spatial self-attention module to capture long-range cloud band dependencies
    and central dense overcast (CDO) symmetry.
    """
    def __init__(self, in_channels: int, num_heads: int = 4):
        super().__init__()
        self.num_heads = num_heads
        self.in_channels = in_channels
        self.head_dim = in_channels // num_heads
        
        self.query_conv = nn.Conv2d(in_channels, in_channels, kernel_size=1)
        self.key_conv = nn.Conv2d(in_channels, in_channels, kernel_size=1)
        self.value_conv = nn.Conv2d(in_channels, in_channels, kernel_size=1)
        self.out_conv = nn.Conv2d(in_channels, in_channels, kernel_size=1)
        self.gamma = nn.Parameter(torch.zeros(1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, C, H, W = x.shape
        proj_query = self.query_conv(x).view(B, self.num_heads, self.head_dim, H * W).permute(0, 1, 3, 2)
        proj_key = self.key_conv(x).view(B, self.num_heads, self.head_dim, H * W)
        
        energy = torch.matmul(proj_query, proj_key) * (self.head_dim ** -0.5)
        attention = torch.softmax(energy, dim=-1)
        
        proj_value = self.value_conv(x).view(B, self.num_heads, self.head_dim, H * W).permute(0, 1, 3, 2)
        out = torch.matmul(attention, proj_value).permute(0, 1, 3, 2).contiguous()
        out = out.view(B, C, H, W)
        out = self.out_conv(out)
        
        return x + self.gamma * out


class ResBlock(nn.Module):
    """Residual convolutional block with GroupNorm and SiLU (Swish) activation."""
    def __init__(self, in_channels: int, out_channels: int, stride: int = 1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1, bias=False)
        self.gn1 = nn.GroupNorm(num_groups=min(8, out_channels), num_channels=out_channels)
        self.act1 = nn.SiLU(inplace=True)
        
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, stride=1, padding=1, bias=False)
        self.gn2 = nn.GroupNorm(num_groups=min(8, out_channels), num_channels=out_channels)
        self.act2 = nn.SiLU(inplace=True)

        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.GroupNorm(num_groups=min(8, out_channels), num_channels=out_channels)
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        res = self.shortcut(x)
        x = self.act1(self.gn1(self.conv1(x)))
        x = self.gn2(self.conv2(x))
        x = self.act2(x + res)
        return x


class MultiSpectralSpatialEncoder(nn.Module):
    """
    Multi-Spectral Spatial Feature Extractor for Tropical Cyclone Imagery.
    Input: (B, T, C, H, W) where C=3 (TIR 10.8µm, WV 6.7µm, Microwave 89GHz), H=W=128
    Output: (B, T, feature_dim) spatial representation tokens.
    Includes Grad-CAM activation caching.
    """
    def __init__(self, in_channels: int = 3, feature_dim: int = 256):
        super().__init__()
        self.in_channels = in_channels
        self.feature_dim = feature_dim

        # Initial Stem: 128x128 -> 64x64
        self.stem = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=5, stride=2, padding=2, bias=False),
            nn.GroupNorm(8, 32),
            nn.SiLU(inplace=True)
        )

        # Stage 1: 64x64 -> 32x32
        self.stage1 = nn.Sequential(
            ResBlock(32, 64, stride=2),
            ResBlock(64, 64, stride=1)
        )

        # Stage 2: 32x32 -> 16x16
        self.stage2 = nn.Sequential(
            ResBlock(64, 128, stride=2),
            ResBlock(128, 128, stride=1),
            SpatialSelfAttention(128, num_heads=4)
        )

        # Stage 3 (Target layer for Grad-CAM): 16x16 -> 8x8
        self.stage3 = nn.Sequential(
            ResBlock(128, 256, stride=2),
            ResBlock(256, 256, stride=1)
        )

        # Global pooling and feature projection
        self.gap = nn.AdaptiveAvgPool2d((1, 1))
        self.fc_proj = nn.Sequential(
            nn.Linear(256, feature_dim),
            nn.LayerNorm(feature_dim),
            nn.SiLU(inplace=True)
        )

        # Grad-CAM hooks storage
        self._gradients: Optional[torch.Tensor] = None
        self._activations: Optional[torch.Tensor] = None

    def _save_gradient(self, grad: torch.Tensor):
        self._gradients = grad

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: Tensor of shape (B, T, C, H, W) or (B, C, H, W)
        Returns:
            features: (B, T, feature_dim) or (B, feature_dim)
            last_conv_maps: (B*T, 256, 8, 8) for attention/Grad-CAM visualization
        """
        is_5d = (x.ndim == 5)
        if is_5d:
            B, T, C, H, W = x.shape
            x_reshaped = x.view(B * T, C, H, W)
        else:
            x_reshaped = x
            B, T = x.shape[0], 1

        # Forward through CNN stages
        h = self.stem(x_reshaped)
        h = self.stage1(h)
        h = self.stage2(h)
        last_conv = self.stage3(h)  # Shape: (B*T, 256, 8, 8)

        # Cache activations and register backward hook for Grad-CAM
        self._activations = last_conv
        if last_conv.requires_grad:
            last_conv.register_hook(self._save_gradient)

        # Pool and project
        pooled = self.gap(last_conv).view(last_conv.size(0), -1)  # (B*T, 256)
        features = self.fc_proj(pooled)  # (B*T, feature_dim)

        if is_5d:
            features = features.view(B, T, self.feature_dim)

        return features, last_conv

    def get_grad_cam(self) -> Optional[torch.Tensor]:
        """
        Computes Grad-CAM attention heatmap from cached activations and gradients.
        Returns: (B*T, 8, 8) normalized heatmap in [0, 1].
        """
        if self._activations is None:
            return None

        if self._gradients is None:
            # If no gradient backpropagated (inference mode), use mean activation across channels
            weights = torch.mean(self._activations, dim=(2, 3), keepdim=True)
            cam = torch.sum(weights * self._activations, dim=1)
        else:
            weights = torch.mean(self._gradients, dim=(2, 3), keepdim=True)
            cam = torch.sum(weights * self._activations, dim=1)

        cam = F.relu(cam)
        # Normalize between 0 and 1
        cam_min = cam.view(cam.size(0), -1).min(dim=1)[0].view(-1, 1, 1)
        cam_max = cam.view(cam.size(0), -1).max(dim=1)[0].view(-1, 1, 1) + 1e-8
        cam_norm = (cam - cam_min) / (cam_max - cam_min)
        return cam_norm

