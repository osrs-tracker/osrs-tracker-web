import { NgTemplateOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideCalendarCheck,
  LucideChevronDown,
  LucideClock,
  LucideDynamicIcon,
  LucideIcon,
  LucideLogOut,
  LucideSwords,
} from '@lucide/angular';
import { Card } from '@app/common/ui/cards/card';
import { Icon } from '@app/common/icon/icon';

interface Step {
  icon: LucideIcon;
  /** The daily checks get the accent, the player's own steps don't */
  check: boolean;
  when: string;
  title: string;
  text: string;
}

/** An answer's text, with an optional link to another site after `text`, then `after` */
interface Question {
  question: string;
  text: string;
  link?: { text: string; href: string };
  after?: string;
}

@Component({
  selector: 'how-it-works',
  templateUrl: './how-it-works.html',
  // Safari still draws the disclosure triangle from this pseudo-element, which `list-style` doesn't reach
  styles: `
    summary::-webkit-details-marker {
      display: none;
    }
  `,
  imports: [Card, Icon, NgTemplateOutlet, RouterLink, LucideChevronDown, LucideDynamicIcon],
})
export default class HowItWorks {
  protected readonly steps: Step[] = [
    {
      icon: LucideClock,
      check: true,
      when: '00:00 UTC',
      title: 'Daily check',
      text: 'We save every tracked player’s hiscores. Yesterday’s gains are final.',
    },
    {
      icon: LucideSwords,
      check: false,
      when: 'During the day',
      title: 'You play',
      text: 'XP from a session stays off the hiscores while you’re logged in.',
    },
    {
      icon: LucideLogOut,
      check: false,
      when: 'When you log out',
      title: 'Hiscores update',
      text: 'Look yourself up: today’s card shows what you’ve gained so far.',
    },
    {
      icon: LucideCalendarCheck,
      check: true,
      when: '00:00 UTC',
      title: 'Next check',
      text: 'The day joins your log. XP you log out with after this counts tomorrow.',
    },
  ];

  protected readonly xpQuestions: Question[] = [
    {
      question: 'Why don’t my gains show up yet?',
      text:
        'The hiscores only update when you log out or hop worlds. While you’re still logged in, nobody can see the XP ' +
        'from that session, us included. Log out, then look yourself up again: today’s card compares the fresh ' +
        'hiscores with the last daily check.',
    },
    {
      question: 'When are players tracked?',
      text:
        'Once a day, at the hour your tracking offset picks, we save a copy of every tracked player’s hiscores. A ' +
        'day’s gains are the difference between two of those copies. Tracking starts the first time anyone looks a ' +
        'player up, so there’s no history from before that.',
    },
    {
      question: 'I logged out after the daily check. Where did that XP go?',
      text:
        'To the next day. If you play from 23:00 to 01:00 UTC and log out at 01:00, the 00:00 check didn’t see any of ' +
        'it, so the whole session counts towards the next day.',
    },
    {
      question: 'What does the tracking offset do?',
      text:
        'It moves the daily check to another hour, so a day ends when yours does: +02:00 UTC checks at 02:00 UTC. ' +
        'Each offset keeps its own history, which starts the first time a player is looked up at it. Your choice is ' +
        'saved on this device.',
    },
    {
      question: 'Why are some skills or activities missing?',
      text:
        'The hiscores only list a skill, boss or minigame once you’re ranked in it, and some need a minimum score ' +
        'first. Until then there’s nothing to track.',
    },
    {
      question: 'Why did my account type change?',
      text:
        'It follows the hiscores you’re listed on. A hardcore ironman who dies moves to the ironman hiscores, and an ' +
        'ironman who de-irons to the regular ones. The player page marks the change.',
    },
    {
      question: 'How long is history kept?',
      text:
        '90 days of daily checks. A player who has been off the hiscores for 7 days stops being checked until someone ' +
        'looks them up again.',
    },
  ];

  protected readonly priceQuestions: Question[] = [
    {
      question: 'Where do prices come from?',
      text: 'From the ',
      link: { text: 'OSRS Wiki’s real-time prices', href: 'https://prices.runescape.wiki/osrs/' },
      after:
        ', which are fed by the Grand Exchange trades of RuneLite players. Instant buy is the latest price someone ' +
        'paid to buy at once, instant sell the latest price someone sold at. They aren’t the game’s guide prices.',
    },
    {
      question: 'How fresh are they?',
      text:
        'The latest prices refresh about every minute, and each one shows when it last traded. Rarely traded items can ' +
        'be hours old, so check the age before you buy.',
    },
    {
      question: 'How is the GE tax worked out?',
      text: 'With the OSRS Wiki’s rules for the Grand Exchange tax, including the items it doesn’t apply to.',
    },
  ];
}
