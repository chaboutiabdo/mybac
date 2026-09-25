import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	content: ["./src/**/*.{ts,tsx}"],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '1.5rem',
			screens: {
				'2xl': '1320px'
			}
		},
		extend: {
			fontFamily: {
				// Readex Pro covers Arabic and Latin with matched metrics: Arabic prose,
				// French units (m/s², kg, N) and KaTeX math sit inline together.
				sans: ['"Readex Pro"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
				// headings use the same face; weight and size carry the hierarchy
				display: ['"Readex Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				// the landing page's accent words, like the serif italics of the
				// reference the owner chose (recorpsmed.com); used nowhere else
				accent: ['"Amiri"', '"Readex Pro"', 'serif']
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))',
					light: 'hsl(var(--primary-light))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					hover: 'hsl(var(--secondary-hover))',
					light: 'hsl(var(--secondary-light))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					hover: 'hsl(var(--accent-hover))',
					light: 'hsl(var(--accent-light))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))',
					light: 'hsl(var(--success-light))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))',
					light: 'hsl(var(--warning-light))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
					light: 'hsl(var(--destructive-light))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					raised: 'hsl(var(--card-raised))'
				},
				// category tones: streams and subjects (src/lib/bac.ts). Prefixed so
				// they don't replace Tailwind's own pink/sky scales.
				tone: {
					pink: 'hsl(var(--tone-pink))',
					'pink-strong': 'hsl(var(--tone-pink-strong))',
					mint: 'hsl(var(--tone-mint))',
					'mint-strong': 'hsl(var(--tone-mint-strong))',
					lav: 'hsl(var(--tone-lav))',
					'lav-strong': 'hsl(var(--tone-lav-strong))',
					peach: 'hsl(var(--tone-peach))',
					'peach-strong': 'hsl(var(--tone-peach-strong))',
					sage: 'hsl(var(--tone-sage))',
					'sage-strong': 'hsl(var(--tone-sage-strong))',
					sky: 'hsl(var(--tone-sky))',
					'sky-strong': 'hsl(var(--tone-sky-strong))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 4px)',
				sm: 'calc(var(--radius) - 6px)',
				// the mockup's card corner
				card: '26px'
			},
			boxShadow: {
				soft: 'var(--shadow-soft)',
				pop: 'var(--shadow-pop)'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
