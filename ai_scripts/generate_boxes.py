# pyrefly: ignore [missing-import]
import cv2
import os
# pyrefly: ignore [missing-import]
from ultralytics import YOLO

def main():
    # Load a pre-trained YOLOv8 model (downloads automatically if not found)
    model = YOLO("yolov8n.pt")
    
    input_dir = os.path.join(os.path.dirname(__file__), "input_images")
    output_dir = os.path.join(os.path.dirname(__file__), "output_images")
    
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Reading images from: {input_dir}")
    
    # Process each image in the input directory
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            image_path = os.path.join(input_dir, filename)
            
            # Run inference
            results = model(image_path)
            
            # Save the result image with bounding boxes
            for result in results:
                # result.plot() returns a numpy array representing the image
                annotated_img = result.plot()
                output_path = os.path.join(output_dir, f"detected_{filename}")
                cv2.imwrite(output_path, annotated_img)
                print(f"Saved processed image to: {output_path}")

if __name__ == "__main__":
    main()
