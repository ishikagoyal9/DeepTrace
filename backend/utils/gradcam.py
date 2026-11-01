import torch
import numpy as np
import cv2


class GradCAM:
    """Trained ResNeXt backbone ke layer4 par Grad-CAM."""

    def __init__(self, feature_extractor):
        self.feature_extractor = feature_extractor
        self.model = feature_extractor.model
        self.model.eval()

        self.gradients = None
        self.activations = None

        # Tensor-level hook: in-place ReLU ke saath full_backward_hook crash karta hai,
        # isliye output tensor par hi hook lagate hain.
        self.model.cnn.layer4.register_forward_hook(self._forward_hook)

        self.transform = feature_extractor.transform

    def _forward_hook(self, module, inputs, output):
        self.activations = output
        if output.requires_grad:
            output.register_hook(self._save_gradient)

    def _save_gradient(self, grad):
        self.gradients = grad.detach()

    def generate_heatmap(self, face_frame):
        self.gradients = None
        self.activations = None

        tensor = self.transform(face_frame).unsqueeze(0).unsqueeze(0)  # (1,1,C,H,W)

        with torch.enable_grad():
            self.model.zero_grad()
            output = self.model(tensor)
            score = output[0, 0]
            score.backward()

        if self.gradients is None or self.activations is None:
            return face_frame

        acts = self.activations.detach()
        weights = self.gradients.mean(dim=[2, 3], keepdim=True)
        cam = (weights * acts).sum(dim=1).squeeze()
        cam = torch.relu(cam).numpy()

        if cam.max() > 0:
            cam = cam / cam.max()

        h, w = face_frame.shape[:2]
        cam_resized = cv2.resize(cam, (w, h))

        heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
        heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

        return cv2.addWeighted(face_frame, 0.6, heatmap_rgb, 0.4, 0)