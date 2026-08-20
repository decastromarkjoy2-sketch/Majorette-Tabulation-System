import { useState, type FormEvent, type ReactNode } from "react";
import {
  getGetSessionQueryKey,
  useCreateOrganizerSession,
  useDeleteSession,
  useGetSession,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrganizerGateProps = {
  children: ReactNode;
  title?: string;
};

export function OrganizerGate({
  children,
  title = "Organizer authorization required",
}: OrganizerGateProps) {
  const queryClient = useQueryClient();
  const [accessCode, setAccessCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { data: session, isLoading } = useGetSession();
  const createSession = useCreateOrganizerSession();
  const deleteSession = useDeleteSession();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    createSession.mutate(
      { data: { accessCode } },
      {
        onSuccess: (nextSession) => {
          setAccessCode("");
          queryClient.setQueryData(getGetSessionQueryKey(), nextSession);
        },
        onError: (error) => {
          setErrorMessage(error.data?.error || "Organizer sign-in failed.");
        },
      },
    );
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Checking authorization...</div>;
  }

  if (session?.role !== "organizer") {
    return (
      <Card className="mx-auto max-w-md border-primary/30 bg-card shadow-sm">
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Enter the private organizer access code to manage judges or delete scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="username"
              autoComplete="username"
              value="organizer"
              readOnly
              className="sr-only"
            />
            <div className="space-y-2">
              <Label htmlFor="organizer-access-code">Organizer access code</Label>
              <Input
                id="organizer-access-code"
                type="password"
                autoComplete="current-password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                disabled={createSession.isPending}
                data-testid="input-organizer-access-code"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-destructive" role="alert" data-testid="text-organizer-auth-error">
                {errorMessage}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={accessCode.length < 8 || createSession.isPending}
              data-testid="button-organizer-sign-in"
            >
              {createSession.isPending ? "Verifying..." : "Unlock organizer tools"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-green-700/30 bg-green-50 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-green-800">
          <ShieldCheck className="h-4 w-4" />
          Organizer tools unlocked
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={deleteSession.isPending}
          onClick={() =>
            deleteSession.mutate(undefined, {
              onSuccess: (nextSession) => {
                queryClient.setQueryData(getGetSessionQueryKey(), nextSession);
              },
            })
          }
          data-testid="button-organizer-sign-out"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Lock
        </Button>
      </div>
      {children}
    </div>
  );
}