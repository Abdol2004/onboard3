# Quick Badge Image Generation Guide

## 🎯 What You Need

Generate 25 badge images (PNG format, 512x512px, transparent background)

## 📋 Badge List & File Names

### Role Badges (8) - Most Important
1. `citizen.png` - Silver/gray medal, user icon
2. `early_citizen.png` - Gold medal with star, commemorative style
3. `contributor.png` - Neon green medal, code/tech theme
4. `captain.png` - Orange medal, rocket/leadership theme
5. `maxi.png` - Cyan medal, layered/blockchain theme
6. `legend.png` - Purple medal, lightning bolt, epic style
7. `major.png` - Hot pink medal, shield, military prestige
8. `core_team.png` - Gold medal with crown and jewels, ultimate prestige

### Achievement Badges (7)
9. `first_quest.png` - Green, checkered flag
10. `quest_master.png` - Gold trophy with laurels
11. `quiz_champion.png` - Cyan, game controller/esports
12. `referral_king.png` - Purple with crown, networking theme
13. `streak_warrior.png` - Orange-red, flame, 100 days
14. `lucky_winner.png` - Gold, dice, sparkles
15. `multiplayer_champion.png` - Hot pink, crossed swords

### Quest Milestones (4)
16. `quest_5.png` - Green, checklist, "5"
17. `quest_10.png` - Cyan, checklist, "10"
18. `quest_25.png` - Gold-cyan gradient, checklist, "25"
19. `quest_50.png` - Gold with stars, checklist, "50"

### Referral Milestones (3)
20. `referral_5.png` - Green, user-friends, "5"
21. `referral_10.png` - Cyan, user-friends, "10"
22. `referral_25.png` - Gold, user-friends, "25"

### Streak Milestones (3)
23. `streak_7.png` - Green, flame, "7"
24. `streak_30.png` - Orange, intense flame, "30"
25. `streak_100.png` - Gold, blazing flame, "100"

## 🚀 Using AI Image Generators

### Option 1: ChatGPT with DALL-E (Recommended for ease)
1. Go to ChatGPT (Plus subscription required)
2. Copy a prompt from README.md
3. Generate and download as PNG
4. Rename to exact filename above

### Option 2: Midjourney (Best quality)
1. Use Discord Midjourney bot
2. Use `/imagine` command with prompt
3. Add `--ar 1:1 --v 6 --quality 2` to end
4. Upscale and download

### Option 3: Leonardo.ai (Free alternative)
1. Sign up for free account
2. Use "PhotoReal" or "3D Animation Style" model
3. Set dimensions to 512x512
4. Generate with prompts from README.md

## 📝 General Prompt Template

```
A photorealistic 3D rendered [bronze/silver/gold] medal badge with a [icon description] in the center, [color] metallic finish, circular shape with [style] outer ring, dramatic lighting showing metallic sheen and depth, professional achievement medal style, transparent background, 512x512px
```

## 🎨 Color References

- **Silver/Gray**: #888888
- **Gold**: #FFD700
- **Neon Green**: #39FF14
- **Orange**: #FF6B35
- **Cyan**: #00D9FF
- **Purple**: #9D4EDD
- **Hot Pink**: #FF0080

## ⚡ Quick Start

**Priority Order:**
1. Generate Role Badges first (most visible)
2. Then Achievement Badges
3. Finally Milestone Badges

**Tip:** Generate 2-3 at a time to maintain consistent style!

## 📁 Where to Save

Save all images to: `public/images/badges/`

The system will automatically use these images when available, and fallback to icons if not.

## ✅ Testing

After generating images:
1. Save PNGs to `public/images/badges/` folder
2. Refresh the Activity page
3. Badge images should load with floating animation
4. If image doesn't exist, fallback icon appears

## 🎯 Pro Tips

- Keep lighting consistent across all badges
- Use same camera angle (straight-on, slight tilt)
- Maintain similar outer ring style
- Add subtle glow effects for premium feel
- Ensure transparent backgrounds
- Test with dark background first

---

**Need help?** Check README.md for full detailed prompts for each badge!
