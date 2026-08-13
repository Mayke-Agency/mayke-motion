import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const password = "Motion2026!";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  await prisma.session.deleteMany();
  await prisma.sportsFormSubmission.deleteMany();
  await prisma.sportsTeamRoster.deleteMany();
  await prisma.sportsTeamCoach.deleteMany();
  await prisma.sportsScheduleEvent.deleteMany();
  await prisma.sportsDocument.deleteMany();
  await prisma.sportsInvoice.deleteMany();
  await prisma.sportsPlayer.deleteMany();
  await prisma.sportsFamily.deleteMany();
  await prisma.sportsCoach.deleteMany();
  await prisma.sportsTeam.deleteMany();
  await prisma.sportsForm.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.websitePage.deleteMany();
  await prisma.campaignEvent.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.registrationNote.deleteMany();
  await prisma.registrationSubmission.deleteMany();
  await prisma.registrationForm.deleteMany();
  await prisma.followUpEmail.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cateringInquiry.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.inquiryNote.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.module.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.website.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();
  await prisma.businessType.deleteMany();

  const restaurantType = await prisma.businessType.create({
    data: {
      code: "RESTAURANT",
      name: "Restaurant",
      description: "Restaurants, hospitality groups, caterers, and experience-led food brands."
    }
  });

  const retailType = await prisma.businessType.create({
    data: {
      code: "RETAIL",
      name: "Retail / Ecommerce",
      description: "Retail, ecommerce, boutique, and product-led businesses."
    }
  });

  const danceType = await prisma.businessType.create({
    data: {
      code: "DANCE_STUDIO",
      name: "Dance Studio / Education",
      description: "Dance studios, education programs, classes, events, and parent communication."
    }
  });

  const sportsType = await prisma.businessType.create({
    data: {
      code: "SPORTS_CLUB",
      name: "Sports Club",
      description: "Club sports organizations managing players, families, teams, dues, schedules, and recruiting."
    }
  });

  const [restaurant, retail, dance, sports] = await Promise.all([
    prisma.business.create({
      data: {
        name: "Coyote Grill",
        slug: "coyote-grill",
        description: "Seasonal neighborhood restaurant with private dining and catering.",
        website: "https://coyotegrill.example",
        contactEmail: "hello@coyotegrill.example",
        phone: "(212) 555-0144",
        address: "84 Mercer Street, New York, NY",
        brandPrimary: "#241915",
        brandAccent: "#733038",
        subscriptionPlan: "GROWTH",
        subscriptionStatus: "ACTIVE",
        businessTypeId: restaurantType.id
      }
    }),
    prisma.business.create({
      data: {
        name: "Mago Hot Sauce",
        slug: "mago-hot-sauce",
        description: "Small-batch hot sauce brand with headless Shopify commerce, wholesale leads, and market activations.",
        website: "https://magohotsauce.example",
        contactEmail: "hello@magohotsauce.example",
        phone: "(786) 555-0166",
        address: "211 NW 24th Street, Miami, FL",
        brandPrimary: "#14110f",
        brandAccent: "#9b6548",
        subscriptionPlan: "PRO",
        subscriptionStatus: "ACTIVE",
        businessTypeId: retailType.id
      }
    }),
    prisma.business.create({
      data: {
        name: "Jete Dance Center",
        slug: "jete-dance-center",
        description: "Premium dance studio offering youth programs, parent communication, recitals, and registration support.",
        website: "https://jetedance.example",
        contactEmail: "hello@jetedance.example",
        phone: "(646) 555-0198",
        address: "410 West 22nd Street, New York, NY",
        brandPrimary: "#14110f",
        brandAccent: "#5e1f23",
        subscriptionPlan: "GROWTH",
        subscriptionStatus: "ACTIVE",
        businessTypeId: danceType.id
      }
    }),
    prisma.business.create({
      data: {
        name: "Ghost Baseball Club",
        slug: "ghost-baseball-club",
        description: "A player-first travel baseball club developing confident athletes and connected families.",
        website: "https://ghostbaseball.example",
        contactEmail: "hello@ghostbaseball.example",
        phone: "(646) 555-0127",
        address: "225 River Avenue, New York, NY",
        brandPrimary: "#181716",
        brandAccent: "#7c2831",
        subscriptionPlan: "GROWTH",
        subscriptionStatus: "ACTIVE",
        businessTypeId: sportsType.id
      }
    })
  ]);

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.createMany({
    data: [
      {
        email: "admin@mayke.agency",
        name: "Ari Mayke",
        passwordHash,
        role: "ADMIN",
        title: "Platform admin"
      },
      {
        email: "owner@bloomtable.com",
        name: "Maya Chen",
        passwordHash,
        role: "CLIENT_OWNER",
        title: "Owner",
        businessId: restaurant.id
      },
      {
        email: "staff@bloomtable.com",
        name: "Leo Martinez",
        passwordHash,
        role: "STAFF",
        title: "Guest experience",
        businessId: restaurant.id
      },
      {
        email: "owner@magohotsauce.com",
        name: "Sofia Rivera",
        passwordHash,
        role: "CLIENT_OWNER",
        title: "Founder",
        businessId: retail.id
      },
      {
        email: "staff@magohotsauce.com",
        name: "Diego Cruz",
        passwordHash,
        role: "STAFF",
        title: "Commerce lead",
        businessId: retail.id
      },
      {
        email: "owner@jetedance.com",
        name: "Elena Brooks",
        passwordHash,
        role: "CLIENT_OWNER",
        title: "Studio director",
        businessId: dance.id
      },
      {
        email: "staff@jetedance.com",
        name: "Camille Torres",
        passwordHash,
        role: "STAFF",
        title: "Program coordinator",
        businessId: dance.id
      },
      {
        email: "owner@ghostbaseball.com",
        name: "Jordan Hayes",
        passwordHash,
        role: "CLIENT_OWNER",
        sportsRole: "CLUB_OWNER",
        title: "Club owner",
        businessId: sports.id
      },
      {
        email: "coach@ghostbaseball.com",
        name: "Marcus Reed",
        passwordHash,
        role: "STAFF",
        sportsRole: "COACH",
        title: "Head coach",
        businessId: sports.id
      },
      {
        email: "new@maykeclient.com",
        name: "New Mayke Client",
        passwordHash,
        role: "CLIENT_OWNER",
        title: "Owner"
      }
    ]
  });

  const restaurantCustomers = await prisma.customer.createManyAndReturn({
    data: [
      {
        businessId: restaurant.id,
        name: "Nora Whitman",
        email: "nora@example.com",
        phone: "(555) 014-2201",
        source: "Private dining form",
        segment: "VIP",
        tags: ["private dining", "wine"],
        lifetimeValue: 4260,
        visits: 18,
        lastContactedAt: daysAgo(2),
        createdAt: daysAgo(70)
      },
      {
        businessId: restaurant.id,
        name: "Elliot Park",
        email: "elliot@example.com",
        phone: "(555) 014-7740",
        source: "Reservation widget",
        segment: "Regular",
        tags: ["brunch", "birthday"],
        lifetimeValue: 1360,
        visits: 9,
        lastContactedAt: daysAgo(7),
        createdAt: daysAgo(52)
      },
      {
        businessId: restaurant.id,
        name: "Harbor Studio Events",
        email: "events@harborstudio.example",
        phone: "(555) 014-3099",
        company: "Harbor Studio",
        source: "Catering inquiry",
        segment: "Corporate",
        tags: ["catering", "corporate"],
        lifetimeValue: 8200,
        visits: 4,
        lastContactedAt: daysAgo(1),
        createdAt: daysAgo(34)
      },
      {
        businessId: restaurant.id,
        name: "Priya Shah",
        email: "priya@example.com",
        phone: "(555) 014-8890",
        source: "Instagram",
        segment: "New",
        tags: ["vegetarian", "weekend"],
        lifetimeValue: 240,
        visits: 2,
        lastContactedAt: daysAgo(12),
        createdAt: daysAgo(18)
      }
    ]
  });

  const retailCustomers = await prisma.customer.createManyAndReturn({
    data: [
      {
        businessId: retail.id,
        name: "Lena Ortiz",
        email: "lena@example.com",
        phone: "(555) 017-1120",
        source: "Shopify import",
        segment: "VIP",
        tags: ["variety pack", "early access"],
        lifetimeValue: 1890,
        visits: 12,
        lastContactedAt: daysAgo(4),
        createdAt: daysAgo(81)
      },
      {
        businessId: retail.id,
        name: "Chef Mateo Alvarez",
        email: "mateo@example.com",
        phone: "(555) 017-5502",
        source: "Pop-up event",
        segment: "Wholesale",
        tags: ["restaurant", "mago verde"],
        lifetimeValue: 640,
        visits: 5,
        lastContactedAt: daysAgo(9),
        createdAt: daysAgo(42)
      },
      {
        businessId: retail.id,
        name: "Mia Santos",
        email: "mia@example.com",
        phone: "(555) 017-9384",
        source: "Newsletter",
        segment: "Repeat",
        tags: ["recipes", "campaign"],
        lifetimeValue: 920,
        visits: 7,
        lastContactedAt: daysAgo(3),
        createdAt: daysAgo(26)
      },
      {
        businessId: retail.id,
        name: "Noah Benton",
        email: "noah@example.com",
        phone: "(555) 017-7319",
        source: "Site chat",
        segment: "New",
        tags: ["heat level", "gift set"],
        lifetimeValue: 210,
        visits: 1,
        lastContactedAt: daysAgo(5),
        createdAt: daysAgo(8)
      }
    ]
  });

  const danceCustomers = await prisma.customer.createManyAndReturn({
    data: [
      {
        businessId: dance.id,
        name: "Amara Lewis",
        email: "parent.amara@example.com",
        phone: "(555) 018-1022",
        source: "Registration form",
        segment: "Parent",
        tags: ["ballet", "recital"],
        lifetimeValue: 2240,
        visits: 14,
        lastContactedAt: daysAgo(2),
        createdAt: daysAgo(88)
      },
      {
        businessId: dance.id,
        name: "The Patel Family",
        email: "patel.family@example.com",
        phone: "(555) 018-6612",
        source: "Trial class",
        segment: "Prospective family",
        tags: ["trial", "jazz"],
        lifetimeValue: 380,
        visits: 2,
        lastContactedAt: daysAgo(5),
        createdAt: daysAgo(21)
      },
      {
        businessId: dance.id,
        name: "Morgan Chen",
        email: "morgan.parent@example.com",
        phone: "(555) 018-7721",
        source: "Summer intensive",
        segment: "Returning student",
        tags: ["intensive", "advanced"],
        lifetimeValue: 3180,
        visits: 22,
        lastContactedAt: daysAgo(1),
        createdAt: daysAgo(120)
      },
      {
        businessId: dance.id,
        name: "Sofia Ramirez",
        email: "sofia.parent@example.com",
        phone: "(555) 018-4430",
        source: "Referral",
        segment: "New student",
        tags: ["tap", "beginner"],
        lifetimeValue: 720,
        visits: 4,
        lastContactedAt: daysAgo(8),
        createdAt: daysAgo(35)
      }
    ]
  });

  const menuItems = await prisma.menuItem.createManyAndReturn({
    data: [
      {
        businessId: restaurant.id,
        name: "Charred Carrot Tartine",
        description: "House sourdough, whipped feta, chili crisp, herbs.",
        category: "Brunch",
        price: 18,
        popularityScore: 92
      },
      {
        businessId: restaurant.id,
        name: "Lemon Herb Roast Chicken",
        description: "Half chicken, preserved lemon jus, crisp potatoes.",
        category: "Dinner",
        price: 34,
        popularityScore: 88
      },
      {
        businessId: restaurant.id,
        name: "Market Greens",
        description: "Seasonal greens, toasted seeds, champagne vinaigrette.",
        category: "Dinner",
        price: 16,
        popularityScore: 76
      },
      {
        businessId: restaurant.id,
        name: "Private Dining Family Menu",
        description: "Shared seasonal menu for groups of 10 or more.",
        category: "Events",
        price: 82,
        popularityScore: 84
      }
    ]
  });

  const products = await prisma.product.createManyAndReturn({
    data: [
      {
        businessId: retail.id,
        name: "Mago Verde Hot Sauce",
        description: "Bright jalapeno, herbs, citrus, and slow-building heat.",
        category: "Signature sauces",
        price: 14,
        inventory: 24
      },
      {
        businessId: retail.id,
        name: "Smoked Guava Fire",
        description: "Guava, smoked chili, and warm island spice.",
        category: "Signature sauces",
        price: 16,
        inventory: 86
      },
      {
        businessId: retail.id,
        name: "Mango Habanero Reserve",
        description: "Ripe mango, habanero, lime, and a glossy finish.",
        category: "Reserve sauces",
        price: 18,
        inventory: 41
      },
      {
        businessId: retail.id,
        name: "Mago Variety Flight",
        description: "Three-bottle tasting set for gifting and first-time buyers.",
        category: "Bundles",
        price: 42,
        inventory: 17
      }
    ]
  });

  const danceEvents = await prisma.event.createManyAndReturn({
    data: [
      {
        businessId: dance.id,
        title: "Spring Recital Showcase",
        type: "RECITAL",
        startsAt: daysAgo(-24),
        endsAt: daysAgo(-24),
        location: "Mainstage Theater",
        capacity: 240,
        registrations: 188
      },
      {
        businessId: dance.id,
        title: "Summer Intensive Registration",
        type: "CLASS",
        startsAt: daysAgo(-42),
        endsAt: daysAgo(-56),
        location: "Studio A",
        capacity: 32,
        registrations: 26
      },
      {
        businessId: dance.id,
        title: "Parent Observation Week",
        type: "PROMOTION",
        startsAt: daysAgo(-15),
        location: "Jete Dance Center",
        capacity: 90,
        registrations: 64
      },
      {
        businessId: dance.id,
        title: "Pre-Teen Jazz Placement",
        type: "CLASS",
        startsAt: daysAgo(-10),
        location: "Studio B",
        capacity: 20,
        registrations: 16
      }
    ]
  });

  const inquiries = await prisma.inquiry.createManyAndReturn({
    data: [
      {
        businessId: restaurant.id,
        customerId: restaurantCustomers[2].id,
        leadName: restaurantCustomers[2].name,
        leadEmail: restaurantCustomers[2].email,
        leadPhone: restaurantCustomers[2].phone,
        kind: "CATERING",
        status: "IN_PROGRESS",
        subject: "Corporate lunch for 45 guests",
        message: "Looking for a seasonal catering menu for a studio offsite next Friday.",
        value: 4200,
        requestedAt: daysAgo(-8),
        source: "Website"
      },
      {
        businessId: restaurant.id,
        customerId: restaurantCustomers[0].id,
        leadName: restaurantCustomers[0].name,
        leadEmail: restaurantCustomers[0].email,
        leadPhone: restaurantCustomers[0].phone,
        kind: "RESERVATION",
        status: "NEW",
        subject: "Private room anniversary dinner",
        message: "Needs availability for 12 guests with wine pairing.",
        value: 1800,
        requestedAt: daysAgo(-14),
        source: "Reservation widget"
      },
      {
        businessId: retail.id,
        leadName: "Noah Benton",
        leadEmail: "noah@example.com",
        leadPhone: "(555) 017-7319",
        kind: "PRODUCT_QUESTION",
        status: "NEW",
        subject: "Heat level help for Mago Variety Flight",
        message: "Asked which sauces are mild enough for a holiday gift set.",
        value: 42,
        source: "Site chat"
      },
      {
        businessId: retail.id,
        customerId: retailCustomers[1].id,
        leadName: retailCustomers[1].name,
        leadEmail: retailCustomers[1].email,
        leadPhone: retailCustomers[1].phone,
        kind: "WHOLESALE",
        status: "IN_PROGRESS",
        subject: "Restaurant wholesale case pricing",
        message: "Wants case pricing for Mago Verde and Smoked Guava Fire.",
        value: 3600,
        source: "Email"
      },
      {
        businessId: dance.id,
        customerId: danceCustomers[1].id,
        leadName: danceCustomers[1].name,
        leadEmail: danceCustomers[1].email,
        leadPhone: danceCustomers[1].phone,
        kind: "REGISTRATION",
        status: "NEW",
        subject: "Trial class follow-up for jazz program",
        message: "Parent asked which class level is the best fit after a Saturday trial class.",
        value: 960,
        source: "Trial class form"
      },
      {
        businessId: dance.id,
        customerId: danceCustomers[2].id,
        leadName: danceCustomers[2].name,
        leadEmail: danceCustomers[2].email,
        leadPhone: danceCustomers[2].phone,
        kind: "RECITAL",
        status: "IN_PROGRESS",
        subject: "Recital costume deadline question",
        message: "Needs the costume payment deadline and rehearsal schedule for the spring recital.",
        value: 240,
        source: "Parent email"
      }
    ]
  });

  await prisma.inquiryNote.createMany({
    data: [
      {
        businessId: restaurant.id,
        inquiryId: inquiries[0].id,
        body: "Client asked for vegetarian options and a delivery window before noon."
      },
      {
        businessId: restaurant.id,
        inquiryId: inquiries[1].id,
        body: "Wine pairing is important. Follow up with private dining minimums."
      },
      {
        businessId: retail.id,
        inquiryId: inquiries[2].id,
        body: "Potential conversion if we reply with heat-level guidance and bundle recommendations."
      },
      {
        businessId: retail.id,
        inquiryId: inquiries[3].id,
        body: "Send wholesale case pricing and restaurant sampling details."
      },
      {
        businessId: dance.id,
        inquiryId: inquiries[4].id,
        body: "Recommend the pre-teen jazz placement class and include registration deadline."
      },
      {
        businessId: dance.id,
        inquiryId: inquiries[5].id,
        body: "Send recital packet link and costume payment reminder."
      }
    ]
  });

  await prisma.followUpEmail.createMany({
    data: [
      {
        businessId: restaurant.id,
        inquiryId: inquiries[0].id,
        customerId: restaurantCustomers[2].id,
        toEmail: "events@harborstudio.example",
        subject: "Coyote Grill catering menu for your studio offsite",
        body: "Thank you for reaching out. We can support a seasonal lunch for 45 guests and would love to confirm timing, dietary notes, and service style.",
        status: "DRAFT"
      },
      {
        businessId: retail.id,
        inquiryId: inquiries[2].id,
        toEmail: "noah@example.com",
        subject: "Heat notes for the Mago Variety Flight",
        body: "Thanks for checking in. Mago Verde is the mildest bottle in the flight, with Smoked Guava Fire and Mango Habanero Reserve bringing more heat.",
        status: "DRAFT"
      },
      {
        businessId: dance.id,
        inquiryId: inquiries[4].id,
        customerId: danceCustomers[1].id,
        toEmail: "patel.family@example.com",
        subject: "Jazz placement recommendation from Jete",
        body: "Thank you for joining us for a trial class. Based on the instructor notes, the pre-teen jazz placement class is the best next step.",
        status: "DRAFT"
      }
    ]
  });

  const restaurantSaleOne = await prisma.sale.create({
    data: {
      businessId: restaurant.id,
      customerId: restaurantCustomers[0].id,
      saleNumber: "BT-1042",
      channel: "Dining room",
      status: "PAID",
      subtotal: 246,
      tax: 22.14,
      total: 268.14,
      placedAt: daysAgo(1),
      saleItems: {
        create: [
          {
            menuItemId: menuItems[1].id,
            name: menuItems[1].name,
            quantity: 4,
            unitPrice: 34,
            total: 136
          },
          {
            menuItemId: menuItems[2].id,
            name: menuItems[2].name,
            quantity: 3,
            unitPrice: 16,
            total: 48
          }
        ]
      }
    }
  });

  await prisma.sale.create({
    data: {
      businessId: restaurant.id,
      customerId: restaurantCustomers[2].id,
      saleNumber: "BT-1043",
      channel: "Catering",
      status: "FULFILLED",
      subtotal: 3280,
      tax: 295.2,
      total: 3575.2,
      placedAt: daysAgo(5),
      saleItems: {
        create: [
          {
            menuItemId: menuItems[3].id,
            name: menuItems[3].name,
            quantity: 40,
            unitPrice: 82,
            total: 3280
          }
        ]
      }
    }
  });

  await prisma.sale.create({
    data: {
      businessId: retail.id,
      customerId: retailCustomers[0].id,
      saleNumber: "MG-2109",
      channel: "Online",
      status: "FULFILLED",
      subtotal: 70,
      tax: 6.3,
      total: 76.3,
      placedAt: daysAgo(2),
      saleItems: {
        create: [
          {
            productId: products[0].id,
            name: products[0].name,
            quantity: 2,
            unitPrice: 14,
            total: 28
          },
          {
            productId: products[3].id,
            name: products[3].name,
            quantity: 1,
            unitPrice: 42,
            total: 42
          }
        ]
      }
    }
  });

  await prisma.sale.create({
    data: {
      businessId: dance.id,
      customerId: danceCustomers[0].id,
      saleNumber: "JD-3301",
      channel: "Registration",
      status: "PAID",
      subtotal: 1480,
      tax: 0,
      total: 1480,
      placedAt: daysAgo(3),
      saleItems: {
        create: [
          {
            name: "Spring semester ballet tuition",
            quantity: 1,
            unitPrice: 1480,
            total: 1480
          }
        ]
      }
    }
  });

  await prisma.order.createMany({
    data: [
      {
        businessId: retail.id,
        customerId: retailCustomers[0].id,
        externalId: "shopify-10042",
        channel: "Shopify",
        status: "FULFILLED",
        total: 76.3,
        placedAt: daysAgo(2),
        metadata: { integration: "Shopify", fulfillment: "Shipped" }
      },
      {
        businessId: dance.id,
        customerId: danceCustomers[2].id,
        externalId: "registration-883",
        channel: "Studio registration",
        status: "PAID",
        total: 1680,
        placedAt: daysAgo(6),
        metadata: { program: "Summer Intensive", paymentPlan: "Paid in full" }
      }
    ]
  });

  await prisma.sale.create({
    data: {
      businessId: retail.id,
      customerId: retailCustomers[2].id,
      saleNumber: "MG-2110",
      channel: "Market booth",
      status: "PAID",
      subtotal: 88,
      tax: 7.92,
      total: 95.92,
      placedAt: daysAgo(4),
      saleItems: {
        create: [
          {
            productId: products[3].id,
            name: products[3].name,
            quantity: 1,
            unitPrice: 42,
            total: 42
          },
          {
            productId: products[1].id,
            name: products[1].name,
            quantity: 2,
            unitPrice: 16,
            total: 32
          }
        ]
      }
    }
  });

  const [restaurantCampaign, retailCampaign, danceCampaign] = await Promise.all([
    prisma.campaign.create({
      data: {
        businessId: restaurant.id,
        name: "Spring Private Dining Push",
        channel: "EMAIL_SMS",
        status: "SENT",
        subject: "A private table for your next celebration",
        body: "Invite your best guests into Coyote Grill's private dining room with a fresh seasonal menu.",
        audience: "VIP and corporate guests",
        sentAt: daysAgo(6),
        budget: 450,
        events: {
          create: restaurantCustomers.map((customer, index) => ({
            customerId: customer.id,
            status: index === 0 ? "CLICKED" : index === 1 ? "OPENED" : "SENT",
            occurredAt: daysAgo(6 - index)
          }))
        }
      }
    }),
    prisma.campaign.create({
      data: {
        businessId: retail.id,
        name: "Mago Verde Restock Early Access",
        channel: "EMAIL",
        status: "SENT",
        subject: "Mago Verde is back before the public restock",
        body: "Give VIP customers early access to Mago Verde before the public restock opens.",
        audience: "VIP and repeat buyers",
        sentAt: daysAgo(3),
        budget: 300,
        events: {
          create: retailCustomers.map((customer, index) => ({
            customerId: customer.id,
            status: index <= 1 ? "CLICKED" : index === 2 ? "OPENED" : "SENT",
            occurredAt: daysAgo(3 - index)
          }))
        }
      }
    }),
    prisma.campaign.create({
      data: {
        businessId: dance.id,
        name: "Recital Readiness Reminder",
        channel: "EMAIL_SMS",
        status: "READY",
        subject: "Costume, rehearsal, and ticket reminders",
        body: "Send parents a concise recital readiness reminder with payment deadlines and rehearsal times.",
        audience: "Recital families",
        sentAt: null,
        budget: 180,
        events: {
          create: danceCustomers.map((customer, index) => ({
            customerId: customer.id,
            status: index === 0 ? "QUEUED" : "SENT",
            occurredAt: daysAgo(1)
          }))
        }
      }
    })
  ]);

  await prisma.messageTemplate.createMany({
    data: [
      {
        businessId: retail.id,
        businessType: "RETAIL",
        type: "FOLLOW_UP",
        name: "Product Question Follow-up",
        subject: "A quick answer from Mago Hot Sauce",
        body: "Hi there,\n\nThanks for reaching out to Mago. I wanted to follow up with a clear recommendation based on your question and make sure you find the right heat level.\n\nBest,\nMago Hot Sauce"
      },
      {
        businessId: retail.id,
        businessType: "RETAIL",
        type: "CAMPAIGN",
        name: "VIP Restock Preview",
        subject: "Early access before the next Mago restock",
        body: "Our next small-batch restock is almost here. As a Mago insider, you get first access before the public announcement."
      },
      {
        businessId: restaurant.id,
        businessType: "RESTAURANT",
        type: "FOLLOW_UP",
        name: "Private Event Next Step",
        subject: "Next steps for your Coyote Grill event",
        body: "Hi there,\n\nThank you for considering Coyote Grill. I wanted to follow up with next steps for your event, including menu direction, guest count, and timing.\n\nWarmly,\nCoyote Grill"
      },
      {
        businessId: restaurant.id,
        businessType: "RESTAURANT",
        type: "CAMPAIGN",
        name: "Weekend Reservation Push",
        subject: "A few prime tables are open this weekend",
        body: "This weekend is filling beautifully. Reserve your table at Coyote Grill and join us for fire-grilled favorites, seasonal specials, and a warm room."
      },
      {
        businessId: dance.id,
        businessType: "DANCE_STUDIO",
        type: "FOLLOW_UP",
        name: "Trial Class Follow-up",
        subject: "Following up on your Jete trial class",
        body: "Hi there,\n\nThank you for your interest in Jete Dance Center. I wanted to follow up with class options, registration details, and next steps for your dancer.\n\nBest,\nJete Dance Center"
      },
      {
        businessId: dance.id,
        businessType: "DANCE_STUDIO",
        type: "ANNOUNCEMENT",
        name: "Recital Reminder",
        subject: "Recital week details and reminders",
        body: "Recital week is almost here. Please review call times, costume notes, ticket reminders, and rehearsal details so every dancer feels prepared."
      }
    ]
  });

  await prisma.registrationForm.create({
    data: {
      businessId: dance.id,
      title: "Jete Trial Class Registration",
      slug: "jete-trial-class-registration",
      description: "Collect family, student, class interest, and trial class details for new Jete families.",
      fee: 0
    }
  });

  await prisma.website.createMany({
    data: [
      { businessId: restaurant.id, domain: "coyotegrill.example", status: "managed_by_mayke", platform: "Next.js" },
      { businessId: retail.id, domain: "magohotsauce.example", status: "managed_by_mayke", platform: "Headless Shopify" },
      { businessId: dance.id, domain: "jetedance.example", status: "managed_by_mayke", platform: "Next.js" },
      { businessId: sports.id, domain: "ghostbaseball.example", status: "managed_by_mayke", platform: "Next.js" }
    ]
  });

  await prisma.integration.createMany({
    data: [
      { businessId: restaurant.id, provider: "TOAST", status: "MOCK", displayName: "Toast POS", accountLabel: "Sales and menu sync staged" },
      { businessId: restaurant.id, provider: "RESEND", status: "CONNECTED", displayName: "Resend Email", accountLabel: "Follow-up email ready", lastSyncedAt: daysAgo(1) },
      { businessId: restaurant.id, provider: "STRIPE", status: "NEEDS_ATTENTION", displayName: "Stripe Billing", accountLabel: "Subscription foundation connected" },
      { businessId: retail.id, provider: "SHOPIFY", status: "MOCK", displayName: "Headless Shopify", accountLabel: "Orders and product sync staged" },
      { businessId: retail.id, provider: "KLAVIYO", status: "MOCK", displayName: "Klaviyo", accountLabel: "Campaign segmentation staged" },
      { businessId: retail.id, provider: "STRIPE", status: "NEEDS_ATTENTION", displayName: "Stripe Billing", accountLabel: "Subscription foundation connected" },
      { businessId: dance.id, provider: "RESEND", status: "CONNECTED", displayName: "Resend Email", accountLabel: "Parent email ready", lastSyncedAt: daysAgo(1) },
      { businessId: dance.id, provider: "TWILIO", status: "MOCK", displayName: "Twilio SMS", accountLabel: "SMS reminders staged" },
      { businessId: dance.id, provider: "STRIPE", status: "NEEDS_ATTENTION", displayName: "Stripe Billing", accountLabel: "Registration payment foundation" },
      { businessId: sports.id, provider: "RESEND", status: "CONNECTED", displayName: "Resend Email", accountLabel: "Family updates ready", lastSyncedAt: daysAgo(1) },
      { businessId: sports.id, provider: "STRIPE", status: "NEEDS_ATTENTION", displayName: "Stripe Connect", accountLabel: "Club dues collection staged" },
      { businessId: sports.id, provider: "TWILIO", status: "MOCK", displayName: "Twilio SMS", accountLabel: "Emergency and practice reminders staged" }
    ]
  });

  const moduleRows = [
    { key: "CRM", label: "CRM", description: "Customer and contact profiles." },
    { key: "INQUIRIES", label: "Inquiries", description: "Lead capture and follow-up workflows." },
    { key: "CAMPAIGNS", label: "Campaigns", description: "Email and SMS campaign planning." },
    { key: "ANALYTICS", label: "Analytics", description: "Revenue, engagement, and operational metrics." },
    { key: "COMMUNICATIONS", label: "Communications", description: "Conversation history and outbound messaging." },
    { key: "INTEGRATIONS", label: "Integrations", description: "Mayke-managed integration readiness." },
    { key: "BILLING", label: "Billing", description: "Subscription and portal access." }
  ] as const;

  await prisma.module.createMany({
    data: [
      ...moduleRows.map((module) => ({ businessId: restaurant.id, ...module })),
      { businessId: restaurant.id, key: "MENU", label: "Menu", description: "Menu and hospitality catalog management." },
      { businessId: restaurant.id, key: "RESERVATIONS", label: "Reservations", description: "Reservation and private event operations." },
      ...moduleRows.map((module) => ({ businessId: retail.id, ...module })),
      { businessId: retail.id, key: "PRODUCTS", label: "Products", description: "Product and inventory visibility." },
      ...moduleRows.map((module) => ({ businessId: dance.id, ...module })),
      { businessId: dance.id, key: "EDUCATION", label: "Education", description: "Programs, recitals, registration, and parent communication." },
      ...moduleRows.map((module) => ({ businessId: sports.id, ...module })),
      { businessId: sports.id, key: "SPORTS", label: "Club operations", description: "Players, teams, schedules, forms, payments, recruiting, and sponsors." }
    ]
  });

  await prisma.reservation.createMany({
    data: [
      {
        businessId: restaurant.id,
        customerId: restaurantCustomers[0].id,
        partySize: 12,
        requestedFor: daysAgo(-14),
        status: "REQUESTED",
        notes: "Private room anniversary dinner with wine pairing."
      },
      {
        businessId: restaurant.id,
        customerId: restaurantCustomers[1].id,
        partySize: 4,
        requestedFor: daysAgo(-3),
        status: "CONFIRMED",
        notes: "Window table requested."
      }
    ]
  });

  await prisma.cateringInquiry.createMany({
    data: [
      {
        businessId: restaurant.id,
        customerId: restaurantCustomers[2].id,
        eventDate: daysAgo(-8),
        guestCount: 45,
        budget: 4200,
        status: "PROPOSAL_SENT",
        notes: "Seasonal corporate lunch with vegetarian options."
      }
    ]
  });

  await prisma.announcement.createMany({
    data: [
      {
        businessId: dance.id,
        title: "Recital costume payment deadline",
        body: "Reminder that costume payments close Friday and rehearsal assignments are posted in the portal.",
        audience: "Recital families",
        status: "READY",
        channel: "EMAIL_SMS",
        scheduledAt: daysAgo(-2)
      },
      {
        businessId: dance.id,
        title: "Summer intensive registration opening",
        body: "Announce early registration for returning students and waitlist families.",
        audience: "Returning students",
        status: "DRAFT",
        channel: "EMAIL",
        scheduledAt: daysAgo(-18)
      }
    ]
  });

  const [restaurantConversation, retailConversation, danceConversation] = await Promise.all([
    prisma.conversation.create({
      data: {
        businessId: restaurant.id,
        customerId: restaurantCustomers[2].id,
        subject: "Corporate catering proposal",
        status: "WAITING"
      }
    }),
    prisma.conversation.create({
      data: {
        businessId: retail.id,
        customerId: retailCustomers[0].id,
        subject: "VIP restock question",
        status: "OPEN"
      }
    }),
    prisma.conversation.create({
      data: {
        businessId: dance.id,
        customerId: danceCustomers[2].id,
        subject: "Summer intensive registration",
        status: "OPEN"
      }
    })
  ]);

  await prisma.message.createMany({
    data: [
      {
        businessId: restaurant.id,
        conversationId: restaurantConversation.id,
        customerId: restaurantCustomers[2].id,
        channel: "EMAIL",
        direction: "OUTBOUND",
        subject: "Catering proposal next steps",
        body: "Proposal draft is ready for review with delivery timing and vegetarian options.",
        sentAt: daysAgo(1)
      },
      {
        businessId: retail.id,
        conversationId: retailConversation.id,
        customerId: retailCustomers[0].id,
        channel: "EMAIL",
        direction: "INBOUND",
        subject: "Mago Verde restock",
        body: "Lena asked whether the Mago Verde restock will include the variety flight.",
        sentAt: daysAgo(2)
      },
      {
        businessId: dance.id,
        conversationId: danceConversation.id,
        customerId: danceCustomers[2].id,
        channel: "EMAIL",
        direction: "OUTBOUND",
        subject: "Summer intensive registration",
        body: "Sent registration reminder and placement details for the intensive.",
        sentAt: daysAgo(1)
      }
    ]
  });

  await prisma.notification.createMany({
    data: [
      {
        businessId: restaurant.id,
        title: "Catering proposal needs approval",
        body: "Harbor Studio Events is waiting on the final catering proposal.",
        status: "UNREAD",
        href: "/dashboard/inquiries"
      },
      {
        businessId: retail.id,
        title: "Shopify sync is staged",
        body: "Product and order imports are currently using demo data until Shopify credentials are connected.",
        status: "UNREAD",
        href: "/dashboard/integrations"
      },
      {
        businessId: dance.id,
        title: "Recital reminders scheduled",
        body: "Review the costume payment reminder before it sends to recital families.",
        status: "UNREAD",
        href: "/dashboard/announcements"
      }
    ]
  });

  await prisma.activityLog.createMany({
    data: [
      {
        businessId: restaurant.id,
        actor: "Maya Chen",
        action: "Marked catering lead as in progress",
        entity: "Corporate lunch for 45 guests",
        metadata: { value: 4200 },
        createdAt: daysAgo(1)
      },
      {
        businessId: restaurant.id,
        actor: "Mayke Motion",
        action: "Synced sale",
        entity: restaurantSaleOne.saleNumber,
        metadata: { futureIntegration: "Toast/Square" },
        createdAt: daysAgo(1)
      },
      {
        businessId: restaurant.id,
        actor: "Maya Chen",
        action: "Reviewed campaign",
        entity: restaurantCampaign.name,
        metadata: { channel: "EMAIL_SMS" },
        createdAt: daysAgo(3)
      },
      {
        businessId: retail.id,
        actor: "Sofia Rivera",
        action: "Updated product inventory",
        entity: products[0].name,
        metadata: { futureIntegration: "Shopify" },
        createdAt: daysAgo(1)
      },
      {
        businessId: retail.id,
        actor: "Diego Cruz",
        action: "Reviewed campaign",
        entity: retailCampaign.name,
        metadata: { channel: "EMAIL" },
        createdAt: daysAgo(2)
      },
      {
        businessId: retail.id,
        actor: "Mayke Motion",
        action: "Captured product inquiry",
        entity: "Heat level help for Mago Variety Flight",
        metadata: { source: "Site chat" },
        createdAt: daysAgo(4)
      },
      {
        businessId: dance.id,
        actor: "Elena Brooks",
        action: "Scheduled recital reminder",
        entity: "Recital Readiness Reminder",
        metadata: { channel: "EMAIL_SMS" },
        createdAt: daysAgo(1)
      },
      {
        businessId: dance.id,
        actor: "Camille Torres",
        action: "Reviewed registration inquiry",
        entity: "Trial class follow-up for jazz program",
        metadata: { source: "Trial class form" },
        createdAt: daysAgo(2)
      },
      {
        businessId: dance.id,
        actor: "Mayke Motion",
        action: "Synced program revenue",
        entity: danceEvents[1].title,
        metadata: { futureIntegration: "Stripe/Square registration" },
        createdAt: daysAgo(3)
      }
    ]
  });

  const ghostCustomers = await prisma.customer.createManyAndReturn({
    data: [
      { businessId: sports.id, name: "Taylor Brooks", email: "taylor.brooks@example.com", phone: "(555) 019-1010", source: "Ghost tryout form", segment: "Tryout interest", tags: ["club", "tryout", "12u"], lifetimeValue: 850, visits: 4, createdAt: daysAgo(40) },
      { businessId: sports.id, name: "Morgan Price", email: "morgan.price@example.com", phone: "(555) 019-2020", source: "Club referral", segment: "Active players", tags: ["club", "player", "13u"], lifetimeValue: 1400, visits: 11, createdAt: daysAgo(94) },
      { businessId: sports.id, name: "Jordan Ellis", email: "jordan.ellis@example.com", phone: "(555) 019-3030", source: "Summer showcase", segment: "Active players", tags: ["club", "player", "14u"], lifetimeValue: 1200, visits: 8, createdAt: daysAgo(72) }
    ]
  });
  const ghostFamilies = await Promise.all([
    prisma.sportsFamily.create({ data: { businessId: sports.id, customerId: ghostCustomers[0].id, familyName: "Brooks", billingContact: "Taylor Brooks", billingEmail: ghostCustomers[0].email, emergencyContact: "Chris Brooks · (555) 019-1011" } }),
    prisma.sportsFamily.create({ data: { businessId: sports.id, customerId: ghostCustomers[1].id, familyName: "Price", billingContact: "Morgan Price", billingEmail: ghostCustomers[1].email, emergencyContact: "Avery Price · (555) 019-2021" } }),
    prisma.sportsFamily.create({ data: { businessId: sports.id, customerId: ghostCustomers[2].id, familyName: "Ellis", billingContact: "Jordan Ellis", billingEmail: ghostCustomers[2].email, emergencyContact: "Sam Ellis · (555) 019-3031" } })
  ]);
  const ghostPlayers = await prisma.sportsPlayer.createManyAndReturn({
    data: [
      { businessId: sports.id, familyId: ghostFamilies[0].id, firstName: "Evan", lastName: "Brooks", graduationYear: 2032, positions: ["Pitcher", "Shortstop"], jerseyNumber: "8", status: "PROSPECT", gpa: 3.7, throws: "Right", bats: "Right", collegeInterestLevel: "EARLY_STAGE" },
      { businessId: sports.id, familyId: ghostFamilies[1].id, firstName: "Mason", lastName: "Price", graduationYear: 2031, positions: ["Catcher", "Third Base"], jerseyNumber: "14", status: "ACTIVE", gpa: 3.8, throws: "Right", bats: "Right", collegeInterestLevel: "EARLY_STAGE" },
      { businessId: sports.id, familyId: ghostFamilies[2].id, firstName: "Noah", lastName: "Ellis", graduationYear: 2030, positions: ["Outfield", "First Base"], jerseyNumber: "22", status: "ACTIVE", gpa: 3.9, throws: "Left", bats: "Left", highlightVideoUrl: "https://video.example/ghost-noah-ellis", collegeInterestLevel: "BUILDING" }
    ]
  });
  const ghostTeams = await prisma.sportsTeam.createManyAndReturn({
    data: [
      { businessId: sports.id, name: "Ghost 12U Navy", ageGroup: "12U", season: "Fall 2026", practiceSchedule: "Tuesdays and Thursdays · 6:00 PM", tournamentSchedule: "Two regional weekends per month" },
      { businessId: sports.id, name: "Ghost 14U Black", ageGroup: "14U", season: "Fall 2026", practiceSchedule: "Mondays and Wednesdays · 7:00 PM", tournamentSchedule: "Showcase weekends and regional qualifiers" }
    ]
  });
  const ghostCoaches = await prisma.sportsCoach.createManyAndReturn({
    data: [
      { businessId: sports.id, name: "Marcus Reed", email: "coach@ghostbaseball.com", phone: "(555) 019-4001", certifications: "USA Baseball, CPR/First Aid", backgroundCheckStatus: "COMPLETE" },
      { businessId: sports.id, name: "Drew Wallace", email: "drew.wallace@example.com", phone: "(555) 019-4002", certifications: "USA Baseball", backgroundCheckStatus: "COMPLETE" }
    ]
  });
  await prisma.sportsTeamRoster.createMany({ data: [
    { businessId: sports.id, teamId: ghostTeams[0].id, playerId: ghostPlayers[0].id, status: "PENDING" },
    { businessId: sports.id, teamId: ghostTeams[1].id, playerId: ghostPlayers[1].id, status: "ACTIVE" },
    { businessId: sports.id, teamId: ghostTeams[1].id, playerId: ghostPlayers[2].id, status: "ACTIVE" }
  ] });
  await prisma.sportsTeamCoach.createMany({ data: [
    { teamId: ghostTeams[0].id, coachId: ghostCoaches[0].id, role: "Head Coach" },
    { teamId: ghostTeams[1].id, coachId: ghostCoaches[1].id, role: "Head Coach" }
  ] });
  const ghostTryoutForm = await prisma.sportsForm.create({ data: { businessId: sports.id, title: "2026 Ghost Baseball Club Tryouts", slug: "2026-ghost-baseball-tryouts", type: "TRYOUT", description: "Share player details and our coaching staff will confirm the right age-group tryout window.", fee: 0, fields: ["Parent name", "Parent email", "Player name", "Graduation year", "Positions", "Notes"] } });
  await prisma.sportsForm.createMany({ data: [
    { businessId: sports.id, title: "Player Registration + Dues", slug: "ghost-player-registration", type: "PLAYER_REGISTRATION", description: "Complete registration after team placement.", fee: 250 },
    { businessId: sports.id, title: "Annual Medical + Waiver", slug: "ghost-medical-waiver", type: "WAIVER", description: "Required before the first team practice.", fee: 0 }
  ] });
  await prisma.sportsFormSubmission.create({ data: { businessId: sports.id, formId: ghostTryoutForm.id, familyId: ghostFamilies[0].id, playerId: ghostPlayers[0].id, status: "NEW", data: { parentName: "Taylor Brooks", playerName: "Evan Brooks", graduationYear: 2032, positions: ["Pitcher", "Shortstop"] } } });
  await prisma.sportsScheduleEvent.createMany({ data: [
    { businessId: sports.id, teamId: ghostTeams[0].id, title: "12U Navy Tryout", type: "TRYOUT", startsAt: daysAgo(-12), location: "Riverfront Field 2" },
    { businessId: sports.id, teamId: ghostTeams[1].id, title: "14U Black Practice", type: "PRACTICE", startsAt: daysAgo(-5), location: "Riverfront Field 1" },
    { businessId: sports.id, teamId: ghostTeams[1].id, title: "Hudson Valley Invitational", type: "TOURNAMENT", startsAt: daysAgo(-18), location: "Hudson Valley Sports Complex" }
  ] });
  await prisma.sportsInvoice.createMany({ data: [
    { businessId: sports.id, familyId: ghostFamilies[1].id, playerId: ghostPlayers[1].id, teamId: ghostTeams[1].id, invoiceNumber: "GBC-0001", description: "Fall 2026 team dues", amount: 1400, status: "PAID", paymentMethod: "Card" },
    { businessId: sports.id, familyId: ghostFamilies[2].id, playerId: ghostPlayers[2].id, teamId: ghostTeams[1].id, invoiceNumber: "GBC-0002", description: "Fall 2026 team dues · installment 1", amount: 400, status: "OPEN", dueAt: daysAgo(-7), installmentPlan: "4 monthly payments", autoPay: true },
    { businessId: sports.id, familyId: ghostFamilies[0].id, playerId: ghostPlayers[0].id, teamId: ghostTeams[0].id, invoiceNumber: "GBC-0003", description: "Tryout registration fee", amount: 75, status: "OPEN", dueAt: daysAgo(-3) }
  ] });
  await prisma.sportsDocument.createMany({ data: [
    { businessId: sports.id, familyId: ghostFamilies[1].id, playerId: ghostPlayers[1].id, name: "Mason Price birth certificate", type: "BIRTH_CERTIFICATE", status: "RECEIVED" },
    { businessId: sports.id, familyId: ghostFamilies[2].id, playerId: ghostPlayers[2].id, name: "Noah Ellis medical form", type: "MEDICAL_FORM", status: "REQUESTED" },
    { businessId: sports.id, familyId: ghostFamilies[0].id, playerId: ghostPlayers[0].id, name: "Evan Brooks club waiver", type: "WAIVER", status: "REQUESTED" }
  ] });
  await prisma.sponsor.createMany({ data: [
    { businessId: sports.id, name: "River & Field Athletics", contactName: "Mila Grant", email: "mila@riverfield.example", tier: "Gold", status: "PARTNER" },
    { businessId: sports.id, name: "Hudson Sports Medicine", contactName: "Dr. Lane", email: "lane@hudsonsports.example", tier: "Community", status: "CONTACTED" }
  ] });
  await prisma.websitePage.createMany({ data: [
    { businessId: sports.id, slug: "home", title: "Baseball built for the next level.", summary: "Ghost Baseball Club develops confident players through disciplined training, strong team culture, and family partnership.", content: "Ghost Baseball Club is a player-first travel baseball program for athletes ready to develop their skills, confidence, and love of the game.", published: true },
    { businessId: sports.id, slug: "about", title: "About Ghost Baseball Club", summary: "A clear player-development culture with a competitive edge.", content: "Our coaches build fundamentals, resilience, and team-first habits across every age group.", published: true },
    { businessId: sports.id, slug: "teams", title: "Teams", summary: "Age-based teams built for growth and meaningful competition.", content: "Explore our current team groups, seasonal approach, practice cadence, and tournament schedule.", published: true },
    { businessId: sports.id, slug: "coaches", title: "Coaches", summary: "Experienced mentors who put players first.", content: "Ghost coaches combine technical instruction, positive accountability, and clear communication with families.", published: true },
    { businessId: sports.id, slug: "tryouts", title: "Tryouts", summary: "Find the right Ghost Baseball Club tryout window.", content: "Complete our tryout form and the coaching staff will share upcoming dates and age-group placement details.", published: true },
    { businessId: sports.id, slug: "schedule", title: "Schedule", summary: "Practices, tournaments, and club events.", content: "Current schedule details are shared with families through the club portal and team communication channels.", published: true },
    { businessId: sports.id, slug: "recruiting", title: "Recruiting", summary: "Long-term athlete development with a recruiting-aware foundation.", content: "Our player profiles evolve with academic, athletic, and video materials as athletes advance.", published: true },
    { businessId: sports.id, slug: "sponsors", title: "Sponsors", summary: "Local partners that help young athletes grow.", content: "Ghost Baseball Club is proud to work with community-minded sponsors and partners.", published: true },
    { businessId: sports.id, slug: "gallery", title: "Gallery", summary: "A look at Ghost Baseball Club in action.", content: "Photo and media galleries are managed by Mayke Agency and club staff.", published: true },
    { businessId: sports.id, slug: "contact", title: "Contact", summary: "Connect with Ghost Baseball Club.", content: "For tryouts, team questions, and club partnerships, reach out through the club contact channel.", published: true }
  ] });
  await prisma.activityLog.createMany({ data: [
    { businessId: sports.id, actor: "Jordan Hayes", action: "Reviewed tryout submission", entity: "Evan Brooks", metadata: { form: "2026 Ghost Baseball Club Tryouts" }, createdAt: daysAgo(1) },
    { businessId: sports.id, actor: "Marcus Reed", action: "Updated 14U Black practice schedule", entity: "Ghost 14U Black", metadata: { schedule: "Monday and Wednesday" }, createdAt: daysAgo(2) },
    { businessId: sports.id, actor: "Mayke Motion", action: "Provisioned Ghost Baseball Club workspace", entity: "Ghost Baseball Club", metadata: { modules: ["SPORTS", "CRM", "COMMUNICATIONS"] }, createdAt: daysAgo(4) }
  ] });

  console.log("Seed complete");
  console.log(`Demo password for all users: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
