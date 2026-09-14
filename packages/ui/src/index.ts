/**
 * `@docento/ui` — the shared design system.
 *
 * Licensed AGPL-3.0 with the rest of the application. `@docento/contracts` and
 * `@docento/sdk` are Apache-2.0 and must never import this package; the reverse
 * direction is fine, and `pnpm boundaries` enforces both.
 *
 * ## What is here and what is not
 *
 * Semantic tokens, the typefaces, the brand marks and presentation primitives
 * live here. Application behaviour — data fetching, permissions, routing — does
 * not, and a shared component that needs the domain is a component that belongs
 * in an application instead.
 *
 * Fonts are deliberately not re-exported from this entry point: importing them
 * pulls in `next/font`, and a package that only needs a button should not.
 * Import them from `@docento/ui/fonts`.
 */

export { cn } from './lib/utils'

/**
 * The brand marks.
 *
 * Exported from the root as well as from `@docento/ui/brand`, because a lockup is
 * a component like any other and there is no cost to it: unlike the fonts, this
 * entry point pulls in no framework machinery, only path data.
 */
export {
  Lockup,
  SYMBOL_INK,
  SYMBOL_PATHS,
  SYMBOL_VIEWBOX,
  SymbolMark,
  Wordmark,
  WORDMARK_HEIGHT,
  WORDMARK_PATHS,
  WORDMARK_TEXT,
  WORDMARK_VIEWBOX,
  WORDMARK_WIDTH,
  type LockupProps,
  type SymbolProps,
  type WordmarkProps,
} from './brand'

export { Badge, badgeVariants, type BadgeProps } from './components/badge'
export {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  alertVariants,
  type AlertProps,
} from './components/alert'
export { Button, buttonVariants, type ButtonProps } from './components/button'
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/card'
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './components/dialog'
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './components/dropdown-menu'
export {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from './components/field'
export { Input } from './components/input'
export {
  InputGroup,
  InputGroupAction,
  InputGroupInput,
} from './components/input-group'
export { Label } from './components/label'
export { Separator } from './components/separator'
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  sheetVariants,
} from './components/sheet'
export { Skeleton } from './components/skeleton'
export { Switch } from './components/switch'
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/table'
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './components/accordion'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/tabs'
export { Textarea } from './components/textarea'
export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toastVariants,
  type ToastProps,
  type ToastVariant,
} from './components/toast'
export { Toaster } from './components/toaster'
export {
  toast,
  useToast,
  type ToastInput,
  type ToastRecord,
} from './components/use-toast'
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from './components/tooltip'
