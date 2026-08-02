"use client";

import { type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  maybeMemo,
  usePerformanceStableCallback,
} from "@/features/performance";

export interface ReportsSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
}

function ReportsSaveDialogComponent({
  open,
  onOpenChange,
  name,
  description,
  isSaving,
  onNameChange,
  onDescriptionChange,
  onSave,
}: ReportsSaveDialogProps) {
  const handleCancel = usePerformanceStableCallback(() => {
    onOpenChange(false);
  });
  const handleNameChange = usePerformanceStableCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onNameChange(event.target.value);
    },
  );
  const handleDescriptionChange = usePerformanceStableCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onDescriptionChange(event.target.value);
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save report</DialogTitle>
          <DialogDescription>
            Save the current category and filters for quick access later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="save-report-name">Name</Label>
            <Input
              id="save-report-name"
              value={name}
              onChange={handleNameChange}
              placeholder="Monthly revenue overview"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="save-report-description">Description</Label>
            <Input
              id="save-report-description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Optional description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!name.trim() || isSaving}>
            Save report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const ReportsSaveDialog = maybeMemo(ReportsSaveDialogComponent);
