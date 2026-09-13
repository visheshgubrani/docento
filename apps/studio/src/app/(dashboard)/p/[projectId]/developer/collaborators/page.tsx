'use client'

import { FormEvent, useState } from 'react'
import {
  Loader2,
  MailPlus,
  ShieldCheck,
  Trash2,
  UserPlus2,
  Users,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useProject } from '@/lib/hooks/use-projects'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import {
  useInviteProjectCollaborator,
  useProjectCollaborators,
  useRemoveProjectCollaborator,
  useRevokeProjectInvitation,
} from '@/lib/hooks/use-collaborators'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    return dateFormatter.format(new Date(value))
  } catch {
    return '—'
  }
}

function TeamTableSkeleton() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <TableRow key={row}>
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-40 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="h-6 w-16 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="text-right">
            <div className="ml-auto h-8 w-20 rounded bg-muted animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default function ProjectCollaboratorsPage() {
  const projectId = useProjectRouteId()
  const { data: project } = useProject(projectId)
  const { toast } = useToast()

  const {
    data: collaborators,
    isLoading,
    error,
  } = useProjectCollaborators(projectId)
  const { mutateAsync: inviteCollaborator, isPending: isInviting } =
    useInviteProjectCollaborator(projectId)
  const { mutateAsync: removeCollaborator, isPending: isRemoving } =
    useRemoveProjectCollaborator(projectId)
  const { mutateAsync: revokeInvitation, isPending: isRevoking } =
    useRevokeProjectInvitation(projectId)

  const [inviteEmail, setInviteEmail] = useState('')
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [revokingInvitationId, setRevokingInvitationId] = useState<
    string | null
  >(null)

  const owner = collaborators?.owner ?? null
  const members = collaborators?.members ?? []
  const invitations = collaborators?.invitations ?? []

  const teamRows: Array<{
    id: string
    displayName: string
    email: string
    image?: string | null
    role: 'OWNER' | 'EDITOR'
    joinedAt?: string
    isOwner: boolean
    memberId?: string
  }> = []

  if (owner) {
    teamRows.push({
      id: owner.id,
      displayName: owner.name || 'Project owner',
      email: owner.email,
      image: owner.image,
      role: 'OWNER',
      isOwner: true,
    })
  }

  members.forEach((member) => {
    teamRows.push({
      id: member.id,
      displayName: member.user.name || member.user.email,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      joinedAt: member.joinedAt,
      isOwner: false,
      memberId: member.id,
    })
  })

  const hasTeam = teamRows.length > 0

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = inviteEmail.trim().toLowerCase()

    if (!email) {
      toast({
        title: 'Email is required',
        description: 'Enter an email address to invite a collaborator.',
        variant: 'destructive',
      })
      return
    }

    try {
      await inviteCollaborator({ email })
      setInviteEmail('')

      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${email}. They can accept or reject by email.`,
      })
    } catch (inviteError) {
      const message =
        inviteError instanceof Error
          ? inviteError.message
          : 'Unable to send invitation.'
      toast({
        title: 'Invite failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleRemoveMember = async (memberId: string, email: string) => {
    setRemovingMemberId(memberId)
    try {
      await removeCollaborator({ memberId })
      toast({
        title: 'Collaborator removed',
        description: `${email} no longer has access to this project.`,
      })
    } catch (removeError) {
      const message =
        removeError instanceof Error
          ? removeError.message
          : 'Unable to remove collaborator.'
      toast({
        title: 'Remove failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleRevokeInvitation = async (
    invitationId: string,
    email: string,
  ) => {
    setRevokingInvitationId(invitationId)
    try {
      await revokeInvitation({ invitationId })
      toast({
        title: 'Invitation revoked',
        description: `Pending invitation for ${email} has been revoked.`,
      })
    } catch (revokeError) {
      const message =
        revokeError instanceof Error
          ? revokeError.message
          : 'Unable to revoke invitation.'
      toast({
        title: 'Revoke failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setRevokingInvitationId(null)
    }
  }

  return (
    <div className="space-y-10">
      <div className="sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold font-literata tracking-wide">
            Collaborators
          </h2>
          <p className="text-lg font-stix text-foreground/80 max-w-2xl tracking-wide">
            Invite teammates to help build courses and manage project content.
            <br />
            Collaborators receive editor access for this project only.
          </p>
        </div>
        <div className="rounded-sm border border-neutral-200 bg-background px-4 py-3 text-sm text-foreground/75">
          <p className="font-semibold text-foreground/90">
            {project?.name ?? 'Current project'}
          </p>
          <p className="text-xs mt-1">Team size: {teamRows.length}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-medium text-destructive">
            Unable to load collaborators
          </p>
          <p className="text-sm text-destructive/85 mt-1">{error.message}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground/80">
            Invite Collaborator
          </h3>
          <div className="flex items-center gap-1.5 text-foreground bg-accent-foreground/50 px-2 py-0.5 rounded-sm">
            <UserPlus2 className="size-4" />
            <span className="text-xs font-medium">EDITOR ACCESS</span>
          </div>
        </div>
        <div className="rounded-sm border border-neutral-200 bg-background p-5">
          <form onSubmit={handleInvite} className="space-y-4">
            <p className="text-sm text-foreground/65">
              Enter an email to send a collaborator invitation. Invitations
              expire in 7 days.
            </p>
            <div className="space-y-2">
              <Label className="font-semibold" htmlFor="collaborator-email">
                Collaborator Email
              </Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-2.5">
                <Input
                  id="collaborator-email"
                  type="email"
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  disabled={isInviting}
                  className="rounded-xs shadow-none border border-muted-foreground/60 h-11"
                  required
                />
                <Button
                  type="submit"
                  className="h-11 px-5 gap-2 rounded-xs bg-accent/90 cursor-pointer hover:bg-accent/80"
                  disabled={!inviteEmail.trim() || isInviting}
                >
                  {isInviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MailPlus className="h-4 w-4" />
                  )}
                  Send Invite
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground/80">
            Team Members
          </h3>
          <div className="flex items-center gap-1.5 text-foreground bg-accent-foreground/50 px-2 py-0.5 rounded-sm">
            <Users className="size-4" />
            <span className="text-xs font-medium">{teamRows.length} TOTAL</span>
          </div>
        </div>
        <div className="rounded-sm border border-neutral-200 bg-background p-5">
          {isLoading ? (
            <div className="overflow-hidden mt-1 rounded-sm border border-neutral-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TeamTableSkeleton />
                </TableBody>
              </Table>
            </div>
          ) : hasTeam ? (
            <div className="overflow-hidden mt-1 rounded-sm border border-neutral-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={row.image ?? ''}
                              alt={row.displayName}
                            />
                            <AvatarFallback>
                              {row.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {row.displayName}
                            </p>
                            <p className="text-xs text-foreground/60 truncate mt-0.5">
                              {row.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            row.role === 'OWNER'
                              ? 'rounded-xs bg-indigo-100 text-indigo-700 border-indigo-200'
                              : 'rounded-xs bg-emerald-100 text-emerald-700 border-emerald-200'
                          }
                        >
                          {row.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-foreground/75">
                          <ShieldCheck className="h-4 w-4" />
                          {row.role === 'OWNER' ? 'Full control' : 'Editor'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/70">
                        {row.isOwner ? '—' : formatDate(row.joinedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.isOwner || !row.memberId ? (
                          <span className="text-xs text-muted-foreground">
                            Project owner
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveMember(row.memberId!, row.email)
                            }
                            disabled={
                              isRemoving && removingMemberId === row.memberId
                            }
                            className="h-9 gap-1.5 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {isRemoving && removingMemberId === row.memberId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="w-full rounded-sm border border-neutral-200 bg-background py-10 px-6">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  No collaborators yet
                </h3>
                <p className="text-sm text-foreground/60 max-w-md">
                  Invite teammates above to help build courses and manage
                  content.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground/80">
            Pending Invitations
          </h3>
          <div className="flex items-center gap-1.5 text-foreground bg-accent-foreground/50 px-2 py-0.5 rounded-sm">
            <MailPlus className="size-4" />
            <span className="text-xs font-medium">
              {invitations.length} PENDING
            </span>
          </div>
        </div>
        <div className="rounded-sm border border-neutral-200 bg-background p-5">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Loading invitations…
              </span>
            </div>
          ) : invitations.length ? (
            <div className="overflow-hidden mt-1 rounded-sm border border-neutral-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="text-sm text-foreground">
                        {invitation.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="rounded-xs bg-emerald-100 text-emerald-700 border-emerald-200"
                        >
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/70">
                        {formatDate(invitation.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/70">
                        {formatDate(invitation.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRevokeInvitation(
                              invitation.id,
                              invitation.email,
                            )
                          }
                          disabled={
                            isRevoking && revokingInvitationId === invitation.id
                          }
                          className="h-9 gap-1.5 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {isRevoking &&
                          revokingInvitationId === invitation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="w-full rounded-sm border border-neutral-200 bg-background py-10 px-6">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <MailPlus className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  No pending invites
                </h3>
                <p className="text-sm text-foreground/60 max-w-md">
                  When you invite new collaborators, pending invitations will
                  appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
