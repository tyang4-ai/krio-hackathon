import zipfile
import os

source_dir = 'backend-python'
output_file = 'backend-deploy-v18.zip'

exclude_dirs = ['__pycache__', '.pytest_cache', 'uploads']
exclude_files = ['.pyc', '.env']

with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(source_dir):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        for file in files:
            if any(ex in file for ex in exclude_files):
                continue

            file_path = os.path.join(root, file)
            # Use forward slashes and remove the source_dir prefix
            rel_path = os.path.relpath(file_path, source_dir)
            arcname = rel_path.replace(os.sep, '/')
            zipf.write(file_path, arcname)
            print(f'Added: {arcname}')

print(f'\nCreated {output_file}')
