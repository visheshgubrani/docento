'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
    BillingPlanId,
    fetchBillingSubscription,
    createBillingOrder,
    verifyBillingPayment,
} from '@/lib/api'
import { useProtectedSession } from '@/components/auth/protected-route'
import { captureClientException, captureEvent } from '@/lib/posthog'
import { cn } from '@/lib/utils'
import { Check, ShieldCheck } from 'lucide-react'
import { IoRocketSharp } from "react-icons/io5";

type BillingFrequency = 'monthly' | 'annually'
type PlanKey = 'free' | 'pro' | 'enterprise'

type RazorpayCheckoutResponse = {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
}

type RazorpayCheckoutOptions = {
    key: string
    amount: number
    currency: string
    name?: string
    description?: string
    order_id: string
    prefill?: {
        name?: string
        email?: string
    }
    handler: (response: RazorpayCheckoutResponse) => void
    modal?: {
        ondismiss?: () => void
    }
    theme?: {
        color?: string
    }
}

type RazorpayCheckout = {
    on: (event: 'payment.failed', handler: (response: any) => void) => void
    open: () => void
}

type RazorpayConstructor = new (
    options: RazorpayCheckoutOptions
) => RazorpayCheckout

declare global {
    interface Window {
        Razorpay?: RazorpayConstructor
    }
}

const PLAN_ID_MAP: Record<
    PlanKey,
    { monthly?: BillingPlanId; annually?: BillingPlanId }
> = {
    free: {},
    pro: {
        monthly: 'PRO_PLAN_MONTHLY',
        annually: 'PRO_PLAN_MONTHLY',
    },
    enterprise: {
        monthly: 'ENTERPRISE_YEARLY',
        annually: 'ENTERPRISE_YEARLY',
    },
}

const planOptions: Array<{
    key: PlanKey
    name: string
    badge?: string
    description: string
    price: { monthly: string; annually: string }
    features: string[]
    isFree?: boolean
    isPopular?: boolean
}> = [
        {
            key: 'free',
            name: 'Free',
            description: 'Perfect for getting started and exploring the platform.',
            price: { monthly: '$0', annually: '$0' },
            features: [
                'Up to 100 monthly active learners',
                'Basic course creation tools',
                'Community support',
                'Edural branding included',
                'Standard API access',
            ],
            isFree: true,
        },
        {
            key: 'pro',
            name: 'Pro',
            badge: 'Most popular',
            description: 'For teams rolling out production-ready learning products.',
            price: { monthly: '$25', annually: '$250' },
            features: [
                'Remove Edural branding',
                'Advanced course types & drip content',
                'Payments integration (Stripe, Razorpay)',
                'Priority webhooks & higher rate limits',
                'Up to 10K monthly active learners',
            ],
            isPopular: true,
        },
        {
            key: 'enterprise',
            name: 'Enterprise',
            description: 'Custom plans for larger teams that need compliance and SLAs.',
            price: { monthly: 'Custom', annually: 'Custom' },
            features: [
                'Dedicated success manager',
                'Enterprise SSO & SAML (Okta, Azure AD)',
                'Isolated environments & private cloud',
                'Advanced audit logs & reporting',
                'Custom SLAs and onboarding',
            ],
        },
    ]

const loadRazorpayScript = () =>
    new Promise<void>((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('Razorpay is only available in the browser.'))
            return
        }

        if (window.Razorpay) {
            resolve()
            return
        }

        const existingScript = document.querySelector(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        )

        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true })
            existingScript.addEventListener(
                'error',
                () => reject(new Error('Unable to load Razorpay payment SDK.')),
                { once: true }
            )
            return
        }

        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        script.onload = () => resolve()
        script.onerror = () =>
            reject(new Error('Unable to load Razorpay payment SDK.'))
        document.body.appendChild(script)
    })

export default function BillingSettingsPage() {
    const session = useProtectedSession()
    const { toast } = useToast()
    const [frequency, setFrequency] = useState<BillingFrequency>('monthly')
    const [processingPlan, setProcessingPlan] = useState<PlanKey | null>(null)
    const [activePlan, setActivePlan] = useState<BillingPlanId | 'FREE'>('FREE')

    useEffect(() => {
        const planFromSession = (session as any)?.user?.subscription?.plan as
            | BillingPlanId
            | 'FREE'
            | undefined

        if (planFromSession) {
            setActivePlan(planFromSession)
        }
    }, [session])

    useEffect(() => {
        const loadSubscription = async () => {
            if (!session?.user) return

            try {
                const subscription = await fetchBillingSubscription()
                setActivePlan(subscription.plan ?? 'FREE')
            } catch (error) {
                console.error('Failed to load billing subscription', error)
            }
        }

        loadSubscription()
    }, [session?.user?.id])

    const activePlanKey: PlanKey = useMemo(() => {
        if (activePlan === 'PRO_PLAN_MONTHLY') return 'pro'
        if (activePlan === 'ENTERPRISE_YEARLY') return 'enterprise'
        return 'free'
    }, [activePlan])

    const handleUpgrade = async (planKey: PlanKey) => {
        if (planKey === 'free') return

        const planId = PLAN_ID_MAP[planKey]?.[frequency]

        if (!planId) {
            toast({
                title: 'Plan unavailable',
                description: 'Choose a valid plan to continue to checkout.',
                variant: 'destructive',
            })
            return
        }

        if (!session?.user) {
            toast({
                title: 'Login required',
                description: 'Sign in to upgrade your account.',
                variant: 'destructive',
            })
            return
        }

        setProcessingPlan(planKey)

        try {
            const order = await createBillingOrder(planId)
            await loadRazorpayScript()

            if (!window.Razorpay) {
                throw new Error('Payment service is not available right now.')
            }

            const plan = planOptions.find((p) => p.key === planKey)
            const checkout = new window.Razorpay({
                key: order.keyId,
                amount: order.amount,
                currency: 'INR',
                name: 'Edural',
                description: plan
                    ? `${plan.name} (${frequency === 'annually' ? 'Annual' : 'Monthly'})`
                    : 'Plan checkout',
                order_id: order.orderId,
                prefill: {
                    name: session.user.name ?? undefined,
                    email: session.user.email ?? undefined,
                },
                handler: async (response) => {
                    try {
                        const verification = await verifyBillingPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planId,
                        })

                        setActivePlan(planId)
                        captureEvent('billing_payment_verified', {
                            billing_frequency: frequency,
                            plan_id: planId,
                            plan_key: planKey,
                            provider: 'razorpay',
                        })
                        toast({
                            title: 'Payment successful',
                            description:
                                verification?.message ?? 'Your subscription is now active.',
                        })
                    } catch (error) {
                        captureEvent('billing_payment_failed', {
                            billing_frequency: frequency,
                            plan_id: planId,
                            plan_key: planKey,
                            provider: 'razorpay',
                            stage: 'verification',
                        })
                        captureClientException(error, {
                            context: 'billing_verify_payment',
                            plan_id: planId,
                            plan_key: planKey,
                        })
                        const message =
                            error instanceof Error
                                ? error.message
                                : 'We could not verify your payment.'

                        toast({
                            title: 'Verification failed',
                            description: message,
                            variant: 'destructive',
                        })
                    } finally {
                        setProcessingPlan(null)
                    }
                },
                modal: {
                    ondismiss: () => {
                        captureEvent('billing_payment_failed', {
                            billing_frequency: frequency,
                            plan_id: planId,
                            plan_key: planKey,
                            provider: 'razorpay',
                            stage: 'dismissed',
                        })
                        setProcessingPlan(null)
                    },
                },
                theme: {
                    color: '#7c3aed',
                },
            })

            checkout.on('payment.failed', (response: any) => {
                captureEvent('billing_payment_failed', {
                    billing_frequency: frequency,
                    plan_id: planId,
                    plan_key: planKey,
                    provider: 'razorpay',
                    reason: response?.error?.reason ?? null,
                    stage: 'checkout',
                })
                toast({
                    title: 'Payment failed',
                    description:
                        response?.error?.description ||
                        response?.error?.reason ||
                        'Something went wrong while processing your payment.',
                    variant: 'destructive',
                })
                setProcessingPlan(null)
            })

            captureEvent('billing_checkout_started', {
                billing_frequency: frequency,
                plan_id: planId,
                plan_key: planKey,
                provider: 'razorpay',
            })
            checkout.open()
        } catch (error) {
            captureEvent('billing_payment_failed', {
                billing_frequency: frequency,
                plan_id: planId,
                plan_key: planKey,
                provider: 'razorpay',
                stage: 'checkout_init',
            })
            captureClientException(error, {
                context: 'billing_start_checkout',
                plan_id: planId,
                plan_key: planKey,
            })
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to start the checkout right now.'

            toast({
                title: 'Checkout issue',
                description: message,
                variant: 'destructive',
            })
            setProcessingPlan(null)
        }
    }

    return (
        <div className="space-y-12 bg-dashboard-bg">
            {/* Header */}
            <div className="sticky top-0 z-10 flex flex-wrap items-end justify-between gap-4 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
                <div className="space-y-3">
                    <h1 className="text-3xl font-semibold font-literata tracking-wide text-foreground">
                        Billing
                    </h1>
                    <p className="text-lg font-stix text-foreground/80 tracking-wide">
                        Manage your subscription and billing preferences
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className="border-muted-foreground bg-muted text-foreground"
                >
                    <ShieldCheck className="mr-1.5 size-4.5" />
                    Secured by Razorpay
                </Badge>
            </div>

            {/* Subscription Overview */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight font-noto text-foreground">Subscription Overview</h2>
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Current Plan */}
                    <div className="rounded-xl border border-muted-foreground/50 bg-white p-5">
                        <p className="text-sm font-medium text-foreground/90 mb-2">Current Plan</p>
                        <div className="border-b border-border/60 mb-4" />
                        <Badge className="bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200 mb-3">
                            Free Plan
                        </Badge>
                        <div className="flex items-end justify-between">
                            <div>
                                <span className="text-2xl font-bold text-foreground">$0</span>
                                <span className="text-sm text-foreground/80"> / Month</span>
                            </div>
                            <Button
                                size="sm"
                                className="bg-sidebar cursor-pointer hover:bg-sidebar/90 text-white rounded-full px-4"
                                onClick={() => document.getElementById('billing-plans')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Upgrade
                                <IoRocketSharp className="ml-0.5 size-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Usage Summary */}
                    <div className="lg:col-span-2 rounded-xl border border-muted-foreground/50 bg-white p-5">
                        <p className="text-sm font-medium text-foreground/90 mb-2">Usage Summary</p>
                        <div className="border-b border-border/60 mb-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* API Requests */}
                            <div>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-xl font-bold text-foreground">0</span>
                                    <span className="text-sm text-foreground/50">/ 1,000</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 rounded-full bg-muted-foreground/20 overflow-hidden">
                                        <div className="h-full rounded-full bg-accent" style={{ width: '2%', minWidth: '4px' }} />
                                    </div>
                                    <span className="text-xs font-medium text-foreground/60">0%</span>
                                </div>
                                <p className="mt-1 text-xs text-foreground/50">API Requests Used</p>
                            </div>
                            {/* Storage */}
                            <div>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-xl font-bold text-foreground">0 MB</span>
                                    <span className="text-sm text-foreground/50">/ 500 MB</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 rounded-full bg-muted-foreground/20 overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-400" style={{ width: '2%', minWidth: '4px' }} />
                                    </div>
                                    <span className="text-xs font-medium text-foreground/60">0%</span>
                                </div>
                                <p className="mt-1 text-xs text-foreground/50">Storage Used</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Billing Plans Section */}
            <div id="billing-plans" className="space-y-6 scroll-mt-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold tracking-tight font-noto text-foreground">Billing Plans</h2>
                    <div className="inline-flex items-center rounded-full border border-muted-foreground/40  bg-muted p-1 text-sm font-medium">
                        <button
                            type="button"
                            onClick={() => setFrequency('monthly')}
                            className={cn(
                                'rounded-full px-5 py-2 transition-all',
                                frequency === 'monthly'
                                    ? 'bg-white text-foreground shadow-sm'
                                    : 'text-foreground/60 hover:text-foreground'
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() => setFrequency('annually')}
                            className={cn(
                                'rounded-full px-5 py-2 transition-all',
                                frequency === 'annually'
                                    ? 'bg-white text-foreground shadow-sm'
                                    : 'text-foreground/70 hover:text-foreground'
                            )}
                        >
                            Annually
                            <span className="ml-1.5 text-xs text-accent font-semibold">Save 17%</span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {planOptions.map((plan) => {
                        const isCurrent = activePlanKey === plan.key
                        const isProcessing = processingPlan === plan.key

                        return (
                            <div
                                key={plan.key}
                                className={cn(
                                    'relative flex flex-col rounded-xl border p-6 transition-all',
                                    plan.isPopular
                                        ? 'bg-gradient-to-br from-sidebar via-[#251842] to-sidebar border-transparent ring-2 ring-accent/30'
                                        : 'bg-white border-muted-foreground/50 hover:shadow-md',
                                    isCurrent && !plan.isPopular && 'border-accent/30'
                                )}
                            >
                                {/* Popular Badge */}
                                {plan.isPopular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-accent font-noto hover:bg-accent border-white/60 text-white shadow-sm">
                                            Most popular
                                        </Badge>
                                    </div>
                                )}

                                {/* Plan Header */}
                                <div className="mb-6 pt-2">
                                    <h3 className={cn(
                                        'text-lg font-semibold',
                                        plan.isPopular ? 'text-white' : 'text-foreground'
                                    )}>
                                        {plan.name}
                                    </h3>
                                    <p className={cn(
                                        'mt-1 text-sm',
                                        plan.isPopular ? 'text-white/70' : 'text-foreground/60'
                                    )}>
                                        {plan.description}
                                    </p>
                                </div>

                                {/* Price */}
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className={cn(
                                            'text-4xl font-semibold font-noto',
                                            plan.isPopular ? 'text-white' : 'text-foreground'
                                        )}>
                                            {plan.price[frequency]}
                                        </span>
                                        {!plan.isFree && plan.price[frequency] !== 'Custom' && (
                                            <span className={cn(
                                                'text-sm',
                                                plan.isPopular ? 'text-white/60' : 'text-foreground/50'
                                            )}>
                                                /{frequency === 'annually' ? 'year' : 'month'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="mb-8 flex-1 space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2.5 text-sm">
                                            <Check className={cn(
                                                'mt-0.5 size-4 shrink-0',
                                                plan.isPopular ? 'text-white' : 'text-accent'
                                            )} />
                                            <span className={cn(
                                                plan.isPopular ? 'text-white/80' : 'text-foreground/80'
                                            )}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <Button
                                    disabled={isProcessing || isCurrent || plan.isFree}
                                    className={cn(
                                        'w-full cursor-pointer',
                                        plan.isPopular
                                            ? 'bg-accent hover:bg-accent/90 border border-white/40 text-white'
                                            : plan.isFree
                                                ? 'bg-muted border border-muted-foreground/40 text-foreground cursor-default'
                                                : 'bg-sidebar hover:bg-sidebar/90 text-white'
                                    )}
                                    onClick={() => handleUpgrade(plan.key)}
                                >
                                    {isCurrent
                                        ? 'Current plan'
                                        : plan.isFree
                                            ? 'Free forever'
                                            : isProcessing
                                                ? 'Processing...'
                                                : plan.price[frequency] === 'Custom'
                                                    ? 'Contact sales'
                                                    : 'Upgrade'}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Footer Note */}
            <div className="text-center">
                <p className="text-sm text-foreground/50">
                    All plans include SSL security, automatic backups, and 99.9% uptime guarantee.
                    <br />
                    Questions? Contact us at{' '}
                    <a href="mailto:billing@docento.dev" className="text-accent hover:underline">
                        billing@docento.dev
                    </a>
                </p>
            </div>
        </div>
    )
}
