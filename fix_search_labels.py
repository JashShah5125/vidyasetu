import os
import re

directory = 'c:/Users/vedant/Desktop/vidyasetu/vidyasetu/src'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all <Input ... placeholder="Search..." ... />
    # We'll use a regex that looks for <Input and then captures up to placeholder="Search..."
    # A robust way is to find <Input ... > blocks
    
    # regex to find <Input ... /> tags
    # We want to match from <Input to /> or > (but be careful of nested or multiline)
    input_tag_pattern = re.compile(r'<Input\s+([^>]*?placeholder=["\']Search[^>]*?)>', re.DOTALL)
    
    def replacer(match):
        inner_content = match.group(1)
        # Check if it already has a label
        if 'label=' in inner_content:
            return match.group(0) # unchanged
        
        # Add label="Search" right after <Input
        return f'<Input label="Search" {inner_content}>'

    new_content = input_tag_pattern.sub(replacer, content)

    # Let's also check if it's <Input without trailing slash, it's covered by [^>]*?>
    
    # Write back if changed
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
