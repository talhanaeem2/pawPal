import { useEffect, useState } from "react";

import { Button } from "@/components/ui/common/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/common/dialog";
import { Field } from "@/components/ui/common/field";
import { Textarea } from "@/components/ui/common/textarea";

type CompletionNoteDialogProps = {
  open: boolean;
  title: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (note: string) => void;
};

export function CompletionNoteDialog({
  open,
  title,
  loading,
  onOpenChange,
  onSave,
}: CompletionNoteDialogProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setNote("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Add a note</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(note);
          }}
        >
          <p className="text-sm text-muted-foreground">
            Add a detail to today&apos;s {title} completion. It will stay with this reminder.
          </p>
          <Field label="Note">
            <Textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything unusual or worth remembering?"
              autoFocus
            />
          </Field>
          <Button className="w-full rounded-full" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save note"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
