import { Component, InputSignal, input, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivityEnum, SkillEnum } from '@osrs-tracker/hiscores';
import { PlayerType } from '@osrs-tracker/models';
import { beforeEach, describe, expect, it } from 'vitest';
import { IconDirective } from './icon.directive';
import { LOCAL_ICONS } from './local-icons.token';

@Component({
  template: '<img icon [name]="name()" [wiki]="wiki()" [skill]="skill()" [activity]="activity()">',
  imports: [IconDirective],
})
class TestComponent {
  readonly name: InputSignal<string> = input('coins');
  readonly wiki: InputSignal<boolean> = input(false);
  readonly skill: InputSignal<boolean> = input(false);
  readonly activity: InputSignal<boolean> = input(false);
}

describe('IconDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let img: HTMLImageElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(TestComponent);
    await fixture.whenStable();

    img = fixture.debugElement.query(By.directive(IconDirective)).nativeElement;
  });

  it('should add icon styling and lazy loading to element', () => {
    expect(img.loading).toBe('lazy');
    expect(img.style.imageRendering).toBe('pixelated');
  });

  it('should map "coins" to icon', async () => {
    fixture.componentRef.setInput('name', 'coins');
    await fixture.whenStable();

    expect(img.src).toContain('/coins.png');
    expect(img.alt).toBe('coins icon');
  });

  it('should map "combat" to icon', async () => {
    fixture.componentRef.setInput('name', 'combat');
    await fixture.whenStable();

    expect(img.src).toContain('/combat.gif');
    expect(img.alt).toBe('combat icon');
  });

  it('should map "dead" to icon', async () => {
    fixture.componentRef.setInput('name', 'dead');
    await fixture.whenStable();

    expect(img.src).toContain('/skull.png');
    expect(img.alt).toBe('dead icon');
  });

  it('should map PlayerTypeEnum to icon', async () => {
    fixture.componentRef.setInput('name', PlayerType.Ironman);
    await fixture.whenStable();

    expect(img.src).toContain('/player_type/ironman.png');
    expect(img.alt).toBe(`${PlayerType.Ironman} icon`);
  });

  it('should map SkillEnum to icon', async () => {
    fixture.componentRef.setInput('name', SkillEnum.Firemaking);
    fixture.componentRef.setInput('skill', true);
    await fixture.whenStable();

    expect(img.src).toContain('/skills/skill_icon_firemaking1.gif');
    expect(img.alt).toBe(`${SkillEnum.Firemaking} icon`);
  });

  it('should map ClueScrollEnum to icon', async () => {
    fixture.componentRef.setInput('name', ActivityEnum.ClueScrollsHard);
    fixture.componentRef.setInput('activity', true);
    await fixture.whenStable();

    expect(img.src).toContain('/activities/game_icon_cluescrollshard.png');
    expect(img.alt).toBe(`${ActivityEnum.ClueScrollsHard} icon`);
  });

  it('should map ActivityEnum to icon', async () => {
    fixture.componentRef.setInput('name', ActivityEnum.SoulWarsZeal);
    fixture.componentRef.setInput('activity', true);
    await fixture.whenStable();

    expect(img.src).toContain('/activities/game_icon_soulwarszeal.png');
    expect(img.alt).toBe(`${ActivityEnum.SoulWarsZeal} icon`);
  });

  it('should map ActivityEnum to icon', async () => {
    fixture.componentRef.setInput('name', ActivityEnum.BountyHunterRogue);
    fixture.componentRef.setInput('activity', true);
    await fixture.whenStable();

    expect(img.src).toContain('/activities/game_icon_bountyhunterrogue.png');
    expect(img.alt).toBe(`${ActivityEnum.BountyHunterRogue} icon`);
  });

  it('should map ActivityEnum to icon', async () => {
    fixture.componentRef.setInput('name', ActivityEnum.LastManStanding);
    fixture.componentRef.setInput('activity', true);
    await fixture.whenStable();

    expect(img.src).toContain('/activities/game_icon_lmsrank.png');
    expect(img.alt).toBe(`${ActivityEnum.LastManStanding} icon`);
  });

  it('should map ActivityEnum to icon', async () => {
    fixture.componentRef.setInput('name', ActivityEnum.KreeArra);
    fixture.componentRef.setInput('activity', true);
    await fixture.whenStable();

    expect(img.src).toContain('/activities/game_icon_kreearra.png');
    expect(img.alt).toBe(`${ActivityEnum.KreeArra} icon`);
  });

  it('should map ActivityEnum to icon', async () => {
    fixture.componentRef.setInput('name', ActivityEnum.TheGauntlet);
    fixture.componentRef.setInput('activity', true);
    await fixture.whenStable();

    expect(img.src).toContain('/activities/game_icon_thegauntlet.png');
    expect(img.alt).toBe(`${ActivityEnum.TheGauntlet} icon`);
  });

  it('should map Wiki item names to wiki image url', async () => {
    fixture.componentRef.setInput('name', 'Abyssal whip.png');
    fixture.componentRef.setInput('wiki', true);
    await fixture.whenStable();

    expect(img.src).toBe('https://oldschool.runescape.wiki/images/Abyssal_whip.png');
    expect(img.alt).toBe('Abyssal whip icon');
  });
});

describe('IconDirective with LOCAL_ICONS', () => {
  const firemakingDataUri = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  let fixture: ComponentFixture<TestComponent>;
  let img: HTMLImageElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LOCAL_ICONS, useValue: { '/skills/skill_icon_firemaking1.gif': firemakingDataUri } },
      ],
    });

    fixture = TestBed.createComponent(TestComponent);
    fixture.componentRef.setInput('skill', true);
    await fixture.whenStable();

    img = fixture.debugElement.query(By.directive(IconDirective)).nativeElement;
  });

  it('should use the data URI of a local icon', async () => {
    fixture.componentRef.setInput('name', SkillEnum.Firemaking);
    await fixture.whenStable();

    expect(img.src).toBe(firemakingDataUri);
  });

  it('should fall back to the file for an icon that is not local', async () => {
    fixture.componentRef.setInput('name', SkillEnum.Attack);
    await fixture.whenStable();

    expect(img.src).toContain('/assets/icons/skills/skill_icon_attack1.gif');
  });
});
