import { createFileRoute } from "@tanstack/react-router";
import { PawPrint } from "lucide-react";

import { Button } from "@/components/ui/common/button";

export const Route = createFileRoute("/_authenticated/onboarding/welcome")({
    component: WelcomePage,
});

function WelcomePage() {
    const navigate = Route.useNavigate();

    return (
        <div className="w-full h-full flex justify-center items-center flex-col">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15">
                <PawPrint className="h-10 w-10 text-primary" />
            </div>

            <div className="flex justify-center items-center flex-col gap-4">
                <h1 className="font-display text-4xl">
                    Welcome to Pawpal
                </h1>
                <p className="text-muted-foreground">
                    Let's set up your first pet.
                    <br />
                    It only takes about a minute.
                </p>
            </div>
            <Button
                className="w-full rounded-full h-11 mt-4"
                onClick={() =>
                    navigate({
                        to: "/onboarding/pet",
                    })
                }
            >
                Get started
            </Button>

        </div>
    );
}