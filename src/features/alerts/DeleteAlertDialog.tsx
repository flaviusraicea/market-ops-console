"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** The only destructive action in the console, so the only use of the danger button. */
export function DeleteAlertDialog({
  label,
  open,
  onOpenChange,
  onConfirm,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => {
          // Start on the safe choice.
          e.preventDefault();
          cancel.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Delete this rule?</DialogTitle>
          <DialogDescription>{`"${label}" will stop being evaluated.`}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            ref={cancel}
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
