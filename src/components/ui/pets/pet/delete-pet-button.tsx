import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractStoragePath } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { petsQuery } from "@/lib/queries";

import { Button } from "@/components/ui/common/button";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";

import { Pet } from "@/schemas/pets";

export function DeletePetButton({ pet, onDeleted }: { pet: Pet, onDeleted?: () => void; }) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pets").delete().eq("id", pet.id);
      if (error) throw error;
      const path = extractStoragePath(pet.photo_url, "pet-photos");
      if (path) {
        const { error: storageError } = await supabase.storage.from("pet-photos").remove([path]);
        if (storageError) console.error("[storage] delete error:", storageError);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: petsQuery.queryKey });
      toast.success(`${pet.name} removed`);
      onDeleted?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
    onSettled: () => setConfirmOpen(false),
  });
  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setConfirmOpen(true)}
        aria-label="Delete pet"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Pet
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove ${pet.name}?`}
        description={`This will permanently delete ${pet.name} and all related schedule, vet, and activity records. This can't be undone.`}
        confirmText="Remove"
        loading={del.isPending}
        confirmVariant="destructive"
        onConfirm={() => del.mutate()}
      />
    </>
  )
}