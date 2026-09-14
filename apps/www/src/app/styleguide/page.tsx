import type { Metadata } from 'next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAction,
  InputGroupInput,
  Lockup,
  Separator,
  Skeleton,
  SymbolMark,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TooltipRoot,
  Wordmark,
} from '@docento/ui'
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CopyIcon,
  InfoIcon,
  XCircleIcon,
} from 'lucide-react'

import { AvailabilityLabel } from '@/components/availability-label'
import { checkedPairs, radii, spacing, swatches, typeScale } from './tokens'
import { ThemeToggle } from './theme-toggle'

/**
 * The component reference.
 *
 * ## Why this page exists
 *
 * A design system's real risk is not that a component is missing; it is that the
 * component exists in four states and only two of them were ever designed. This
 * page renders every primitive in every state the design system claims — default,
 * hover, focus, pressed, disabled, pending, error and success — so "the disabled
 * state exists" is something a person can check in ten seconds rather than
 * something a reviewer has to take on trust.
 *
 * ## It is not a page of the site
 *
 * `noindex`, absent from the sitemap, and not linked from anywhere a visitor can
 * reach. It is a working surface for whoever is extending the system, and the
 * visual-regression tests use it because it puts every state on one screen.
 */
export const metadata: Metadata = {
  title: 'Component reference',
  robots: { index: false, follow: false },
}

function Block({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-border-decorative flex flex-col gap-6 border-t pt-10">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-title">{title}</h2>
        {description ? (
          <p className="text-ink-muted max-w-[70ch] text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export default function StyleguidePage() {
  return (
    <main id="main" className="marketing-container flex flex-col gap-12 py-16">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="preview-label">Internal</p>
            <h1 className="font-display text-section">Component reference</h1>
          </div>
          <ThemeToggle />
        </div>
        <p className="text-ink-muted max-w-[70ch] text-body-lg leading-relaxed">
          Every token, mark and primitive the design system publishes, in every
          state it claims to support. Not indexed, not linked from the site, and
          the surface the visual-regression tests photograph.
        </p>
      </header>

      <Block
        title="Identity"
        description="The symbol is drawn from two page shapes, the right one carrying a stem so it reads as a lowercase d. The wordmark is Geist Sans Medium outlined to paths, so it renders identically wherever it is placed."
      >
        <div className="flex flex-wrap items-end gap-10">
          <div className="flex flex-col items-start gap-2">
            <SymbolMark
              style={{ height: 56, width: 'auto' }}
              className="text-ink"
            />
            <span className="preview-label">Symbol · 56px</span>
          </div>
          <div className="flex flex-col items-start gap-2">
            <SymbolMark
              style={{ height: 16, width: 'auto' }}
              className="text-ink"
            />
            <span className="preview-label">Favicon · 16px</span>
          </div>
          <div className="flex flex-col items-start gap-2">
            <Wordmark
              style={{ height: 24, width: 'auto' }}
              className="text-ink"
            />
            <span className="preview-label">Wordmark</span>
          </div>
          <div className="flex flex-col items-start gap-2">
            <Lockup height={24} className="text-ink" />
            <span className="preview-label">Horizontal lockup</span>
          </div>
        </div>
      </Block>

      <Block
        title="Colour tokens"
        description="Each token is named for its role. The contrast column is computed from the stylesheet, so it cannot go stale."
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {swatches.map((swatch) => (
            <li
              key={swatch.token}
              className="border-border-decorative flex flex-col gap-2 rounded-[var(--radius-card)] border p-3"
            >
              <div className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="border-border-decorative h-10 flex-1 rounded-md border"
                  style={{ backgroundColor: swatch.light }}
                />
                <span
                  aria-hidden="true"
                  className="border-border-decorative h-10 flex-1 rounded-md border"
                  style={{ backgroundColor: swatch.dark }}
                />
              </div>
              <span className="font-mono text-xs">--{swatch.token}</span>
              <span className="text-ink-muted text-xs">{swatch.role}</span>
              <span className="text-ink-muted font-mono text-[0.6875rem]">
                {swatch.light} · {swatch.dark}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-border-decorative overflow-hidden rounded-[var(--radius-card)] border">
          <Table label="Contrast ratios for the checked token pairs">
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Light</TableHead>
                <TableHead>Dark</TableHead>
                <TableHead>Minimum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkedPairs.map((pair) => (
                <TableRow key={`${pair.foreground}-${pair.background}`}>
                  <TableCell className="font-mono text-xs">
                    --{pair.foreground} on --{pair.background}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {pair.light.toFixed(2)}:1
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {pair.dark.toFixed(2)}:1
                  </TableCell>
                  <TableCell className="text-ink-muted">
                    {pair.foreground.startsWith('border')
                      ? '3:1 (1.4.11)'
                      : '4.5:1 (AA)'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Block>

      <Block
        title="Type scale"
        description="Three families with distinct jobs. Serif type never appears in a dense control."
      >
        <ul className="flex flex-col gap-6">
          {typeScale.map((entry) => (
            <li key={entry.token} className="flex flex-col gap-2">
              <span className="text-ink-muted font-mono text-xs">
                --{entry.token} · {entry.usage}
              </span>
              <span
                className={
                  entry.token === 'text-hero' || entry.token === 'text-section'
                    ? 'font-display'
                    : entry.token === 'text-meta' ||
                        entry.token === 'text-micro'
                      ? 'font-sans uppercase'
                      : 'font-sans'
                }
                style={
                  entry.token === 'text-hero'
                    ? {
                        fontSize: 'var(--text-hero)',
                        lineHeight: 'var(--text-hero--line-height)',
                      }
                    : entry.token === 'text-section'
                      ? {
                          fontSize: 'var(--text-section)',
                          lineHeight: 'var(--text-section--line-height)',
                        }
                      : entry.token === 'text-title'
                        ? {
                            fontSize: 'var(--text-title)',
                            lineHeight: 'var(--text-title--line-height)',
                          }
                        : entry.token === 'text-body-lg'
                          ? {
                              fontSize: 'var(--text-body-lg)',
                              lineHeight: 'var(--text-body-lg--line-height)',
                            }
                          : entry.token === 'text-lesson'
                            ? {
                                fontSize: 'var(--text-lesson)',
                                lineHeight: 'var(--text-lesson--line-height)',
                              }
                            : entry.token === 'text-meta'
                              ? { fontSize: 'var(--text-meta)' }
                              : { fontSize: 'var(--text-micro)' }
                }
              >
                {entry.sample}
              </span>
            </li>
          ))}
        </ul>
      </Block>

      <Block
        title="Spacing, radii and frames"
        description="A 4px scale, and three radii with one job each."
      >
        <ul className="flex flex-wrap items-end gap-4">
          {spacing.map((step) => (
            <li key={step} className="flex flex-col items-center gap-2">
              <span
                aria-hidden="true"
                className="bg-accent-decorative rounded-sm"
                style={{ width: step, height: 24 }}
              />
              <span className="font-mono text-[0.6875rem]">{step}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-6">
          {radii.map((radius) => (
            <div
              key={radius.token}
              className="flex flex-col items-center gap-2"
            >
              <span
                aria-hidden="true"
                className="border-border-control size-20 border"
                style={{ borderRadius: radius.value }}
              />
              <span className="font-mono text-[0.6875rem]">
                {radius.token} · {radius.value}px
              </span>
              <span className="text-ink-muted text-xs">{radius.usage}</span>
            </div>
          ))}
        </div>

        <div className="edge-sheet p-6">
          <p className="text-sm">Offset sheet — the page-edge motif</p>
        </div>
      </Block>

      <Block
        title="Buttons"
        description="Every variant in every state. Hover and focus are shown as they render; disabled and pending are real attributes."
      >
        <div className="flex flex-col gap-6">
          {(
            ['default', 'secondary', 'outline', 'ghost', 'destructive'] as const
          ).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <span className="text-ink-muted w-24 font-mono text-xs">
                {variant}
              </span>
              <Button variant={variant}>Default</Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
              <Button variant={variant} aria-busy="true">
                Saving…
              </Button>
              <span className="bg-surface-subtle rounded-md p-1">
                <Button variant={variant} className="ring-[3px] ring-brand/35">
                  Focused
                </Button>
              </span>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-ink-muted w-24 font-mono text-xs">sizes</span>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="marketing">Marketing</Button>
            <Button size="icon" aria-label="Copy">
              <CopyIcon aria-hidden="true" />
            </Button>
            <Button variant="link">
              Link button <ArrowRightIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Block>

      <Block
        title="Fields"
        description="A visible control boundary, an associated label, and an error that is announced."
      >
        <div className="grid gap-8 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="styleguide-title">Course title</FieldLabel>
            <Input
              id="styleguide-title"
              defaultValue="The fundamentals of visual storytelling"
            />
            <FieldDescription>
              A draft can be renamed at any time.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="styleguide-error">Academy slug</FieldLabel>
            <Input
              id="styleguide-error"
              aria-invalid
              defaultValue="Field Work"
              aria-describedby="styleguide-error-message"
            />
            <FieldError id="styleguide-error-message">
              <AlertTriangleIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              Slugs are lower case and may not contain spaces.
            </FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="styleguide-disabled">
              Support address
            </FieldLabel>
            <Input
              id="styleguide-disabled"
              disabled
              defaultValue="hello@fieldwork.example"
            />
            <FieldDescription>Set by the workspace owner.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="styleguide-note">Lesson summary</FieldLabel>
            <Textarea
              id="styleguide-note"
              defaultValue="A cut is the moment two shots are asked to mean something together."
            />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="styleguide-embed">Embed code</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="styleguide-embed"
                readOnly
                defaultValue='<script src="https://academy.example.com/embed.js"></script>'
              />
              <InputGroupAction>
                <CopyIcon aria-hidden="true" />
                Copy
              </InputGroupAction>
            </InputGroup>
          </Field>
        </div>
      </Block>

      <Block
        title="Status and alerts"
        description="Status is carried by words and icons; colour agrees with them rather than replacing them."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <AvailabilityLabel availability="available" />
            <AvailabilityLabel availability="preview" />
            <AvailabilityLabel availability="planned" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge>Neutral</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Published</Badge>
            <Badge variant="warning">Draft</Badge>
            <Badge variant="error">Failed</Badge>
            <Badge variant="info">Preview</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(['default', 'info', 'success', 'warning', 'error'] as const).map(
              (variant) => (
                <Alert key={variant} variant={variant}>
                  <AlertIcon variant={variant}>
                    {variant === 'error' ? (
                      <XCircleIcon />
                    ) : variant === 'warning' ? (
                      <AlertTriangleIcon />
                    ) : variant === 'success' ? (
                      <CheckCircleIcon />
                    ) : (
                      <InfoIcon />
                    )}
                  </AlertIcon>
                  <AlertTitle>{variant} alert</AlertTitle>
                  <AlertDescription>
                    A message about the thing next to it, with the status in the
                    words rather than only in the colour.
                  </AlertDescription>
                </Alert>
              ),
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </Block>

      <Block
        title="Disclosure, menus and overlays"
        description="Radix handles focus, Escape and restoration. What is added here is the surface."
      >
        <div className="flex flex-wrap items-start gap-6">
          <Accordion
            type="single"
            collapsible
            defaultValue="one"
            className="w-full max-w-lg"
          >
            <AccordionItem value="one">
              <AccordionTrigger>
                Is the self-hosted version fully usable?
              </AccordionTrigger>
              <AccordionContent>
                <p>It is the whole product, and it is pre-alpha.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="two">
              <AccordionTrigger>What costs remain?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Wherever you run it, and any optional provider you connect.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-col gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Course</DropdownMenuLabel>
                <DropdownMenuItem>Open editor</DropdownMenuItem>
                <DropdownMenuItem>Copy link</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  Archive course
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Archive course…</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Archive “The fundamentals of visual storytelling”?
                  </DialogTitle>
                  <DialogDescription>
                    Learners keep their progress and their certificates. The
                    course stops appearing in the catalogue.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="secondary">Cancel</Button>
                  <Button variant="destructive">Archive course</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <TooltipRoot content="Copy the example">
              <Button variant="outline">Tooltip</Button>
            </TooltipRoot>
          </div>
        </div>
      </Block>

      <Block
        title="Tabs and table"
        description="Keyboard behaviour is the primitive's; the visual language is the system's."
      >
        <Tabs defaultValue="curriculum">
          <TabsList>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="curriculum">
            <p className="text-ink-muted text-sm">
              Modules, lessons and their order.
            </p>
          </TabsContent>
          <TabsContent value="settings">
            <p className="text-ink-muted text-sm">
              Title, summary and completion rule.
            </p>
          </TabsContent>
          <TabsContent value="history">
            <p className="text-ink-muted text-sm">
              Published releases and when they went live.
            </p>
          </TabsContent>
        </Tabs>

        <Table label="Component states">
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead>Treatment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Pending</TableCell>
              <TableCell className="text-ink-muted">
                The control stays operable, the label changes, and the user’s
                input is preserved
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Error</TableCell>
              <TableCell className="text-ink-muted">
                Boundary, icon and message — never colour alone
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Success</TableCell>
              <TableCell className="text-ink-muted">
                Announced in a live region as well as shown
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Block>

      <Block title="Cards and surfaces">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Surface card</CardTitle>
              <CardDescription>
                A thin border and a restrained shadow. Stronger elevation is
                reserved for menus and dialogs.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-ink-muted text-sm">
              Content sits in the card&rsquo;s own padding, not the
              page&rsquo;s.
            </CardContent>
          </Card>

          <div className="edge-panel flex flex-col gap-4 p-6">
            <p className="preview-label">Inset panel</p>
            <Separator />
            <p className="text-ink-muted text-sm">
              The subtle surface, used for selected regions and inset panels.
            </p>
          </div>
        </div>
      </Block>
    </main>
  )
}
