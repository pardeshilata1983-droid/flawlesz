#!/usr/bin/env python3
import subprocess

cards = [
    {
        "filename": "public/og-default.png",
        "badge": "AI VALIDATION & STRESS-TESTING",
        "title": "Flaw",
        "subtitle": "Pinpoint Critical Flaws, Map Competitors & Build",
        "desc": "Autonomous stress-testing engine that scans live web markets,",
        "desc2": "detects structural blindspots, and coordinates AI Teammates.",
        "footer": "https://flaw.app  •  1200 x 630 Default Share Preview"
    },
    {
        "filename": "public/og-validator.png",
        "badge": "LIVE MARKET DIAGNOSTICS",
        "title": "Idea Validator",
        "subtitle": "Multi-Model Stress Testing: Orbit, Pulsar & Quasar",
        "desc": "Upload pitch decks or describe hypotheses to receive deep",
        "desc2": "competitor analysis, fatal flaw detection, and refined pivots.",
        "footer": "https://flaw.app/flaw/submit  •  Idea Validator"
    },
    {
        "filename": "public/og-teammates.png",
        "badge": "MULTI-AGENT CODING OFFICE",
        "title": "AI Teammates",
        "subtitle": "5 Autonomous Specialists Building Full-Stack Software",
        "desc": "Lead Architect Atlas, Frontend Elena, Backend Nova, Debugger",
        "desc2": "Cypher & Reviewer Iris constructing apps in live browser sandbox.",
        "footer": "https://flaw.app/flaw/teammates  •  AI Teammates Office"
    },
    {
        "filename": "public/og-pricing.png",
        "badge": "TRANSPARENT SUBSCRIPTION TIERS",
        "title": "Plans & Pricing",
        "subtitle": "Fair-Use Quotas, Pro & Ultra AI Teammate Access",
        "desc": "From free everyday validations to high-throughput specialized",
        "desc2": "AI models with zero lock-in and seamless Razorpay subscriptions.",
        "footer": "https://flaw.app/flaw/billing  •  Subscription Plans"
    },
    {
        "filename": "public/og-gallery.png",
        "badge": "COMMUNITY INTELLIGENCE",
        "title": "Public Idea Gallery",
        "subtitle": "Explore Validated Startups, Market Flaws & Refinements",
        "desc": "Browse an interactive showcase of evaluated product concepts,",
        "desc2": "competitor breakdowns, and diagnostic viability scores.",
        "footer": "https://flaw.app/flaw/gallery  •  Idea Gallery"
    }
]

for card in cards:
    cmd = [
        "convert",
        "-size", "1200x630",
        "xc:#0D0F14",
        # Decorative outer border
        "-stroke", "#222634",
        "-strokewidth", "2",
        "-fill", "none",
        "-draw", "roundrectangle 40,40 1160,590 24,24",
        # Top accent bar
        "-stroke", "none",
        "-fill", "#E8481C",
        "-draw", "roundrectangle 80,80 180,86 3,3",
        # Badge Pill
        "-fill", "#1A1D26",
        "-stroke", "#30364A",
        "-strokewidth", "1",
        "-draw", "roundrectangle 80,110 440,146 18,18",
        # Badge Text
        "-stroke", "none",
        "-fill", "#E8481C",
        "-pointsize", "14",
        "-font", "FreeSans-Bold",
        "-annotate", "+100+133", card["badge"],
        # Main Title
        "-fill", "#FFFFFF",
        "-pointsize", "56",
        "-font", "FreeSans-Bold",
        "-annotate", "+80+225", card["title"],
        # Subtitle
        "-fill", "#E8481C",
        "-pointsize", "28",
        "-font", "FreeSans",
        "-annotate", "+80+280", card["subtitle"],
        # Description Line 1 & 2
        "-fill", "#A0A5B5",
        "-pointsize", "22",
        "-font", "FreeSans",
        "-annotate", "+80+355", card["desc"],
        "-annotate", "+80+390", card["desc2"],
        # Divider line
        "-stroke", "#222634",
        "-strokewidth", "1",
        "-draw", "line 80,480 1120,480",
        # Footer branding
        "-stroke", "none",
        "-fill", "#6C7286",
        "-pointsize", "16",
        "-font", "FreeMono",
        "-annotate", "+80+530", card["footer"],
        card["filename"]
    ]
    subprocess.run(cmd, check=True)
    print(f"Generated: {card['filename']}")
