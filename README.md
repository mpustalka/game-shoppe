# game-shoppe

This is a [Next.js](https://nextjs.org) project
Need to setup Supabase for db

## Getting Started

First, run supabase & the development server:

pnpm exec supabase start

pnpm exec supabase login

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


TO DO ongoing..

Binder UI + Card Variant System Upgrade - Done
Requested Features
1. Real 9-Pocket Binder UI - Done

The current binder page should visually resemble a real trading card binder.

2. Reverse Holo Variants - Done

Every:

Common
Uncommon
Rare

must support:

Normal
Reverse Holo
3. Add EX Card Variant

The inventory/add-card flow is missing:

EX

This should be selectable as a rarity/value type.

Layout Goals

The binder should feel like:

-A physical Pokémon binder
-9-pocket pages
-Swipeable/mobile friendly
-Tablet optimized
Animated page turns - to do
Glossy premium card pockets - to do maybe



fixed - now for Inventory need a better way to srt and view cards and search, especially when the card shops will have thousands of cards available. Search inventory by set feature as well i think.


Also grab images of the reverse holo versions, and reverse pokeball versions frompricecharting.com/category/pokemon-cards if tcgplayer doesnt have them if you can. also for the  finishing types dropdown just add everything and the user can choose  options  see below - Finishing Types:

Normal - Common/Uncommon/Rare/ 
Reverse Holo - Common/Uncommon/Rare 
Pokeball Rev Holo - Common/Uncommon/Rare
Energy Symbol Rev Holo -Common/Uncommon/Rare 
Other Rev Holo - Common/Uncommon/Rare 
Masterball Rev Holo - Common/Uncommon/Rare 
Holo Rare Rare/Non Holo 
Promo - Rev holo/Holo/Cosmo Holo/Stamped/Other 
V - V / V-Max / V-Star 
EX - EX / EX Full Art 
Full Art Illustration 
Rare Special
Illustration Rare


Other Competitions
A fee on sales for sellers utilizing a third-party eCommerce platform like Crystal Commerce, BinderPOS, or Ion Sync - https://www.ionsuite.com/pricing. These fees are determined by the sync provider.


Collector version & For Card Shop's version - Figure out models for getting paid? Tiered pricing by use maybe?

Signup, register
Need Login Page - use auth supabase
fix routes to show nothing unless user is signed in so need a single homepage adn fix routes

Also need to save up to 5 sessions that can last for 72 hours - where If a new customer walks up and needs cards searched I can save they're cards they have selected for later - or something similiar 

Setup database so saves not locally anymore
- eed a better earch with tcg player  some cards do NOT show up so need to search by name and number 
Setup bucket's 


1. Need Search for each set once vlicked on 
be able to checkmark numerous cards at once
be able to quick add card's to binders - need to be able to PICK which binder 

Need a way to ort by card rarity as well once in a binder or a set ex. common, uncommon, Ex, V, Vstar


2 Need to save card's after being sold inventory listing


need a way to add pictures from phone upload a photo need to have a front and back and than optional up to 4 pictures per card when uploaded,
Add A graded card binder


Analytics - most searched and sold cards - have a dashboard showing which sets  most popular and cards and so on and so on

Add buy list next to each card with qantitity
Some cards rev holo, pokeball rev holo masterball etc...

Mobile view
Add chat function to go directly to Andrew for questions


Need a way to save card lists for later - create a custom list for a customer and save it for later and save a note.


Need to save a session for later

Have a BUY LIST with Store credit price  - need to have buy rate at 75% of card value
