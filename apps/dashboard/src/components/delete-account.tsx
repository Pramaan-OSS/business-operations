"use client";

import { LogEvents } from "@business-operations/events/events";
import { createClient } from "@business-operations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@business-operations/ui/alert-dialog";
import { Button } from "@business-operations/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@business-operations/ui/card";
import { Input } from "@business-operations/ui/input";
import { Label } from "@business-operations/ui/label";
import { useEvents } from "@business-operations/events/client";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { redirectAfterAccountDeletion } from "@/actions/revalidate-action";
import { useTRPC } from "@/trpc/client";

export function DeleteAccount() {
  const supabase = createClient();
  const trpc = useTRPC();
  const { track } = useEvents();

  const deleteUserMutation = useMutation(
    trpc.user.delete.mutationOptions({
      onSuccess: async () => {
        track(LogEvents.AccountDeleted.name);
        await supabase.auth.signOut();
        await redirectAfterAccountDeletion();
      },
    }),
  );

  const [value, setValue] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          Permanently remove your Personal Account and all of its contents from
          the Business Operations platform. This action is not reversible, so please continue
          with caution.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between">
        <div />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={!ready}
              className="hover:bg-destructive text-muted"
            >
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove your data from this installation. Workspaces with other members stay available; transfer their ownership first. For workspaces where you are the only member, this also disconnects connected accounts and ends their rentals.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col gap-2 mt-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-medium">DELETE</span> to confirm.
              </Label>
              <Input
                id="confirm-delete"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteUserMutation.mutate()}
                disabled={value !== "DELETE"}
              >
                {deleteUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Continue"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
      {deleteUserMutation.error && <p role="alert" className="px-6 pb-6 text-sm">{deleteUserMutation.error.message}</p>}
    </Card>
  );
}
