import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Move, ZoomIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/common/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/common/dialog";
import { Slider } from "@/components/ui/common/slider";

const CROP_SIZE = 280;
const OUTPUT_SIZE = 800;

type ImageSize = {
  width: number;
  height: number;
};

type Position = {
  x: number;
  y: number;
};

type PhotoCropDialogProps = {
  open: boolean;
  imageUrl: string;
  onCancel: () => void;
  onComplete: (file: File) => void;
};

export function PhotoCropDialog({
  open,
  imageUrl,
  onCancel,
  onComplete,
}: PhotoCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ pointerId: number; x: number; y: number; position: Position } | null>(
    null,
  );
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setImageSize(null);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [imageUrl, open]);

  const getLayout = (nextZoom = zoom) => {
    if (!imageSize) {
      return null;
    }

    const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
    const scale = baseScale * nextZoom;
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;

    return {
      scale,
      width,
      height,
      maxX: Math.max(0, (width - CROP_SIZE) / 2),
      maxY: Math.max(0, (height - CROP_SIZE) / 2),
    };
  };

  function constrainPosition(nextPosition: Position, nextZoom = zoom) {
    const layout = getLayout(nextZoom);

    if (!layout) {
      return nextPosition;
    }

    return {
      x: Math.max(-layout.maxX, Math.min(layout.maxX, nextPosition.x)),
      y: Math.max(-layout.maxY, Math.min(layout.maxY, nextPosition.y)),
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!imageSize) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      position,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;

    if (!start || start.pointerId !== event.pointerId) {
      return;
    }

    setPosition(
      constrainPosition({
        x: start.position.x + event.clientX - start.x,
        y: start.position.y + event.clientY - start.y,
      }),
    );
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current?.pointerId === event.pointerId) {
      dragStart.current = null;
    }
  }

  async function saveCrop() {
    const image = imageRef.current;
    const layout = getLayout();

    if (!image || !layout || !imageSize) {
      return;
    }

    try {
      setSaving(true);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Your browser couldn't prepare the photo.");
      }

      const sourceX = -((CROP_SIZE - layout.width) / 2 + position.x) / layout.scale;
      const sourceY = -((CROP_SIZE - layout.height) / 2 + position.y) / layout.scale;
      const sourceSize = CROP_SIZE / layout.scale;

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("Couldn't create the cropped photo."))),
          "image/jpeg",
          0.9,
        );
      });

      onComplete(
        new File([blob], "photo.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't crop the photo");
    } finally {
      setSaving(false);
    }
  }

  const layout = getLayout();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Crop photo</DialogTitle>
          <DialogDescription>Drag to reposition, then zoom until your photo fills the frame.</DialogDescription>
        </DialogHeader>

        <div
          className="relative mx-auto h-70 w-70 max-w-full touch-none overflow-hidden rounded-3xl bg-secondary/70"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop preview"
            draggable={false}
            onLoad={(event) => {
              setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              });
            }}
            onError={() => toast.error("This photo format can't be opened in this browser.")}
            className="pointer-events-none absolute max-w-none select-none"
            style={
              layout
                ? {
                  width: layout.width,
                  height: layout.height,
                  left: (CROP_SIZE - layout.width) / 2 + position.x,
                  top: (CROP_SIZE - layout.height) / 2 + position.y,
                }
                : { opacity: 0 }
            }
          />
          {!imageSize && <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading photo…</div>}
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={[zoom]}
            onValueChange={([nextZoom]) => {
              setZoom(nextZoom);
              setPosition((current) => constrainPosition(current, nextZoom));
            }}
            aria-label="Zoom photo"
          />
        </div>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Move className="h-3.5 w-3.5" aria-hidden="true" /> Drag the photo to position it
        </p>

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1 rounded-full" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-full"
            disabled={!imageSize || saving}
            onClick={saveCrop}
          >
            {saving ? "Preparing…" : "Use photo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
