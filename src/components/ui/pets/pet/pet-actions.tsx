import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/common/button";
import { DeletePetButton } from "./delete-pet-button";
import { PetFormDialog } from "../pet-form-dialog";

import { Pet } from "@/schemas/pets";

export function PetActions({ pet, onDeleted }: { pet: Pet, onDeleted?: () => void; }) {

    return (
        <div className="grid grid-cols-2 gap-3">
            <PetFormDialog
                pet={pet}
                trigger={
                    <Button
                        variant="outline"
                        aria-label="Edit pet"
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Pet
                    </Button>
                }
            />
            <DeletePetButton pet={pet} onDeleted={onDeleted} />
        </div>
    )
}
