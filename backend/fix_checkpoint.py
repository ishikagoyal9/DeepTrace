import zipfile, os

src_dir = r'C:\Users\Asus\Downloads\best_model (1)\best_model'
fixed_path = 'models/best_model_fixed.pth'

with zipfile.ZipFile(fixed_path, 'w', zipfile.ZIP_STORED) as zf:
    for root, dirs, files in os.walk(src_dir):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, os.path.dirname(src_dir))
            zf.write(full_path, rel_path)

print(f'Fixed checkpoint saved to: {fixed_path}')

import torch
test = torch.load(fixed_path, map_location='cpu', weights_only=False)
print(f'Verified — loads correctly, {len(test)} keys found.')