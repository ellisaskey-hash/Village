// Launch-copy generator (spec 08 §checklist: "Join link + Facebook/PTA launch copy generated,
// template in console"). Pure, template-based: given a community it produces ready-to-paste copy
// for the founder to announce the launch. No AI — these are stable, voice-checked templates.

export interface LaunchCommunity {
  name: string;
  slug: string;
}

export interface LaunchCopy {
  joinLink: string;
  facebook: string;
  pta: string;
  poster: string;
}

/** Build the join link + announcement templates. `origin` is the deployed site origin. */
export function launchCopy(community: LaunchCommunity, origin: string): LaunchCopy {
  const site = origin.replace(/\/$/, '');
  const joinLink = `${site}/welcome?community=${community.slug}`;
  const name = community.name;

  const facebook =
    `${name} has somewhere new to sort the everyday stuff, without the noise.\n\n` +
    `It's a private space just for our village: buy and sell, ask for a hand, lend a ladder, ` +
    `find a local trade, see what's on, and get the alerts that matter (lost pets, road closures, that sort of thing).\n\n` +
    `Real names, neighbours only. No adverts, no politics, no drama.\n\n` +
    `Join here: ${joinLink}`;

  const pta =
    `Subject: A simpler way to keep ${name} families in the loop\n\n` +
    `Hello,\n\n` +
    `We've set up a space for ${name} where the school, the PTA and local families can share what's ` +
    `coming up, ask for help, and pass things on. It's private to the village and free to join.\n\n` +
    `You can post the fair, term dates and notices in one place, and parents get them without ` +
    `scrolling past everything else.\n\n` +
    `Have a look and join here: ${joinLink}\n\n` +
    `Thank you,\nThe ${name} team`;

  const poster =
    `${name.toUpperCase()}\n` +
    `Your village, in one place.\n\n` +
    `Buy and sell. Ask for a hand. What's on. Local alerts.\n` +
    `Neighbours only. Real names.\n\n` +
    `Scan or visit:\n${joinLink}`;

  return { joinLink, facebook, pta, poster };
}
