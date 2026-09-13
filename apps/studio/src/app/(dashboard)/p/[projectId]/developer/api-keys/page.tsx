"use client";

import { useState } from "react";
import { Check, Copy, Key, Loader2, Plus, Trash } from "lucide-react";
import { MdAdminPanelSettings } from "react-icons/md";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useProjectRouteId } from "@/lib/hooks/use-project-route-id";
import { useProject } from "@/lib/hooks/use-projects";
import {
  useCreateProjectApiKey,
  useDeleteProjectApiKey,
  useProjectApiKeys,
} from "@/lib/hooks/use-api-keys";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return "—";
  }
}

function maskSecretKey(key: string) {
  if (!key || key.length < 8) return "sk_••••••••••••";
  // Show first 7 chars (e.g., sk_live_) + asterisks + last 4 chars
  const prefix = key.slice(0, 7);
  const suffix = key.slice(-4);
  return `${prefix}******${suffix}`;
}

function CopyButton({
  value,
  label,
  onError,
}: {
  value: string;
  label: string;
  onError: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError();
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-foreground transition-colors hover:text-accent"
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check className="size-4 text-lime-600" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

function SecretKeysTableSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <TableRow key={item}>
          <TableCell className="pl-4">
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-48 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="text-right pr-4">
            <div className="ml-auto h-8 w-20 rounded bg-muted animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

type CreateKeyDialogProps = {
  projectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<void>;
  isSubmitting: boolean;
};

function CreateKeyDialog({
  projectName,
  open,
  onOpenChange,
  onCreate,
  isSubmitting,
}: CreateKeyDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const resetState = () => {
    setName("");
    setError("");
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setError("");
    await onCreate(trimmed);
    resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-noto font-semibold">
            Create API key
          </DialogTitle>
          <DialogDescription className="text-foreground/70 mt-2">
            Name your key and confirm which project it belongs to. You can
            rotate keys at any time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid gap-2">
            <div className="rounded-sm border border-muted-foreground/70 bg-muted px-3 py-2 text-sm text-foreground/80">
              Project:{" "}
              <span className="font-medium text-foreground ml-1">
                {projectName ?? "Current project"}
              </span>
            </div>
            <Label
              className="mt-4 font-semibold font-noto"
              htmlFor="api-key-name"
            >
              Key Name
            </Label>
            <Input
              id="api-key-name"
              placeholder="Docs key, staging key, etc."
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              className="rounded-sm mt-1 shadow-none border border-muted-foreground/80"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-sm border cursor-pointer shadow-none hover:text-foreground"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-accent/80 cursor-pointer  hover:bg-accent/70 rounded-sm"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SaveKeyDialogProps = {
  open: boolean;
  apiKey?: string;
  onClose: () => void;
};

function SaveKeyDialog({ open, apiKey, onClose }: SaveKeyDialogProps) {
  const { toast } = useToast();

  const copyKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      toast({
        title: "Key copied",
        description: "API key copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Unable to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-noto font-semibold">
            Save your key
          </DialogTitle>
          <DialogDescription className="mt-1 text-foreground/60">
            Please save your secret key in a safe place since you won't be able
            to view it again. Keep it secure, as anyone with your API key can
            make requests on your behalf. If you lose it, you'll need to
            generate a new one.
            <span className="text-destructive ml-1">*</span>
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xs border border-neutral-200 bg-muted/30 p-4">
          <div className="flex flex-col gap-3">
            <div className="rounded-xs bg-background border border-neutral-300 font-medium px-3 py-3 overflow-hidden">
              <code className="text-sm font-mono text-foreground break-all whitespace-pre-wrap block">
                {apiKey ?? "••••••••••"}
              </code>
            </div>
            <Button
              variant="outline"
              onClick={copyKey}
              className="gap-2 bg-muted hover:text-foreground cursor-pointer rounded-xs w-full h-10"
            >
              <Copy className="h-4 w-4" />
              Copy to clipboard
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full rounded-xs bg-accent/80 cursor-pointer  hover:bg-accent/70 sm:w-auto"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type RevokeKeyDialogProps = {
  open: boolean;
  keyName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isRevoking: boolean;
};

function RevokeKeyDialog({
  open,
  keyName,
  onConfirm,
  onCancel,
  isRevoking,
}: RevokeKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(openState) => !openState && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-noto font-semibold">
            Revoke API Key
          </DialogTitle>
          <DialogDescription className="mt-1 text-foreground/65">
            Are you sure you want to revoke{" "}
            <span className="font-semibold text-foreground">
              {keyName || "this key"}
            </span>
            ? This action cannot be undone and any integrations using this key
            will stop working immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 mt-6 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isRevoking}
            className="rounded-xs hover:text-foreground cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isRevoking}
            className="gap-2 rounded-xs cursor-pointer"
          >
            {isRevoking && <Loader2 className="h-4 w-4 animate-spin" />}
            Revoke Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectApiKeysPage() {
  const projectId = useProjectRouteId();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const {
    data: apiKeysData,
    isLoading: isKeysLoading,
    isError: isKeysError,
    error: keysError,
    refetch,
  } = useProjectApiKeys(projectId);
  const { toast } = useToast();

  const { mutateAsync: createKey, isPending: isCreating } =
    useCreateProjectApiKey(projectId);
  const { mutateAsync: deleteKey } = useDeleteProjectApiKey(projectId);

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSaveOpen, setSaveOpen] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [revokeDialogState, setRevokeDialogState] = useState<{
    open: boolean;
    keyId: string | null;
    keyName: string | null;
  }>({ open: false, keyId: null, keyName: null });
  const [isRevoking, setIsRevoking] = useState(false);

  const publishableKey = apiKeysData?.publishableKey ?? "";
  const secretKeys = apiKeysData?.secretKeys ?? [];

  const handleCreateKey = async (name: string) => {
    try {
      const payload = await createKey({ name });
      setNewKeySecret(payload.apiKey);
      setSaveOpen(true);
      toast({
        title: "Key created",
        description: "Copy and store your key securely.",
      });
      setCreateOpen(false);
    } catch (error) {
      toast({
        title: "Unable to create key",
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const openRevokeDialog = (keyId: string, keyName: string) => {
    setRevokeDialogState({ open: true, keyId, keyName });
  };

  const closeRevokeDialog = () => {
    setRevokeDialogState({ open: false, keyId: null, keyName: null });
  };

  const handleConfirmRevoke = async () => {
    if (!revokeDialogState.keyId) return;

    setIsRevoking(true);
    try {
      await deleteKey({ keyId: revokeDialogState.keyId });
      toast({
        title: "Secret key revoked",
        description: "The key is no longer active.",
      });
      closeRevokeDialog();
    } catch (error) {
      toast({
        title: "Unable to delete key",
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsRevoking(false);
    }
  };

  const closeSaveDialog = () => {
    setSaveOpen(false);
    setNewKeySecret(null);
  };

  const handleCopyPublishableKey = async () => {
    if (!publishableKey) return;
    try {
      await navigator.clipboard.writeText(publishableKey);
      toast({
        title: "Copied",
        description: "Publishable key copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Unable to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProjectIdCopyError = () => {
    toast({
      title: "Unable to copy",
      description: "Please try again.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold font-literata tracking-wide">
            API Keys
          </h2>
          <p className="text-lg font-stix text-foreground/80 max-w-2xl tracking-wide">
            {isProjectLoading
              ? "Loading project keys..."
              : `Issue and rotate tokens for ${
                  project?.name ?? "your project"
                }.`}
            <br />
            Manage publishable and secret keys for API access.
          </p>
        </div>
        <Button
          className="gap-2 bg-accent hover:bg-accent/80 h-10 px-5 rounded-sm font-medium shrink-0 cursor-pointer"
          disabled={!projectId}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-5" />
          Create API Key
        </Button>
      </div>

      {/* Publishable Key Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground/80">
            Publishable Key
          </h3>
          <div className="flex border border-muted-foreground/50 items-center gap-2 rounded px-2.5 py-1.5 bg-muted/60">
            <span className="text-foreground/70 bg-white px-1 rounded-md min-w-[70px] text-sm font-medium">
              Project ID
            </span>
            <code className="flex-1 bg-accent-100 font-medium rounded-md px-2 truncate font-mono text-sm text-foreground/80">
              {projectId}
            </code>
            <CopyButton
              value={projectId}
              label="Project ID"
              onError={handleProjectIdCopyError}
            />
          </div>
        </div>
        <div className="rounded-sm border border-neutral-200 bg-background p-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground/60">
              Safe to use in your frontend (React, iOS, Android). Configures the
              Storefront SDK.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                aria-label="Publishable key"
                readOnly
                value={publishableKey}
                placeholder={
                  isKeysLoading
                    ? "Loading key..."
                    : "No publishable key available"
                }
                className="bg-muted/40 font-mono text-sm text-foreground/80 sm:flex-1 h-11 shadow-none border-neutral-300 rounded-xs"
              />
              <Button
                type="button"
                variant="outline"
                className="gap-2 h-11 px-5 rounded-xs hover:text-foreground cursor-pointer"
                onClick={handleCopyPublishableKey}
                disabled={isKeysLoading || !publishableKey}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Secret Keys Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground/80">
              Secret Keys
            </h3>
            <div className="flex items-center gap-1.5 text-foreground bg-accent-foreground/50 px-2 py-0.5 rounded-sm">
              <MdAdminPanelSettings className="size-4.5" />
              <span className="text-xs font-medium">Admin access</span>
            </div>
          </div>
          <p className="text-sm text-foreground/70">
            {isKeysLoading
              ? "Loading keys..."
              : secretKeys.length === 1
              ? "1 secret key"
              : `${secretKeys.length} secret keys`}
          </p>
        </div>

        {/* Secret Keys Table */}
        {isKeysLoading ? (
          <div className="overflow-x-auto rounded-sm border border-neutral-200 bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-neutral-200">
                  <TableHead className="text-foreground/90 font-medium pl-4">
                    Name
                  </TableHead>
                  <TableHead className="text-foreground/90 font-medium w-1/3">
                    Secret Key
                  </TableHead>
                  <TableHead className="text-foreground/90 font-medium">
                    Created
                  </TableHead>
                  <TableHead className="text-foreground/90 font-medium pl-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SecretKeysTableSkeleton />
              </TableBody>
            </Table>
          </div>
        ) : isKeysError ? (
          <div className="rounded-sm border border-neutral-200 bg-background p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Unable to load keys
                </p>
                <p className="text-sm text-muted-foreground">
                  {keysError?.message ?? "Please try again in a moment."}
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : secretKeys.length === 0 ? (
          <div className="w-full bg-background rounded-sm border border-neutral-200 py-16 px-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-5 mb-5">
                <Key className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                No secret keys yet
              </h3>
              <p className="text-base text-foreground/60 max-w-md mb-6">
                Secret keys are used to authenticate backend requests to your
                API. Create your first key to get started with backend
                integrations.
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="gap-2 rounded-sm"
              >
                <Plus className="size-5" />
                Create Your First Key
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-neutral-200 bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-neutral-200">
                  <TableHead className="text-foreground/90 font-medium pl-4">
                    Name
                  </TableHead>
                  <TableHead className="text-foreground/90 font-medium w-1/3">
                    Secret Key
                  </TableHead>
                  <TableHead className="text-foreground/90 font-medium">
                    Created
                  </TableHead>
                  <TableHead className="text-foreground/90 font-medium pl-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secretKeys.map((key) => (
                  <TableRow
                    key={key.id}
                    className="border-b border-neutral-100 hover:bg-muted/70"
                  >
                    <TableCell className="font-medium text-foreground pl-4">
                      {key.name}
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-sm text-foreground/80">
                        {maskSecretKey(key.key)}
                      </code>
                    </TableCell>
                    <TableCell className="text-foreground/60">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openRevokeDialog(key.id, key.name)}
                      >
                        <Trash className="h-4 w-4" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CreateKeyDialog
        projectName={project?.name}
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreateKey}
        isSubmitting={isCreating}
      />

      <SaveKeyDialog
        open={isSaveOpen}
        apiKey={newKeySecret ?? undefined}
        onClose={closeSaveDialog}
      />

      <RevokeKeyDialog
        open={revokeDialogState.open}
        keyName={revokeDialogState.keyName ?? undefined}
        onConfirm={handleConfirmRevoke}
        onCancel={closeRevokeDialog}
        isRevoking={isRevoking}
      />
    </div>
  );
}
