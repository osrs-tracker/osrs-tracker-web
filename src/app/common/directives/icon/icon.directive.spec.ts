import { Component, InputSignal, input, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  BossEnum,
  BountyHunterEnum,
  ClueScrollsEnum,
  CompetitiveEnum,
  MiniGameEnum,
  RaidEnum,
  SkillEnum,
} from '@osrs-tracker/hiscores';
import { PlayerType } from '@osrs-tracker/models';
import { IconDirective } from './icon.directive';

@Component({
  template: '<img icon [name]="name()" [wiki]="wiki()">',
  imports: [IconDirective],
})
class TestComponent {
  readonly name: InputSignal<string> = input('coins');
  readonly wiki: InputSignal<boolean> = input(false);
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

    expect(img.src).toContain('/combat.png');
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
    await fixture.whenStable();

    expect(img.src).toContain('/skills/skill_icon_firemaking1.gif');
    expect(img.alt).toBe(`${SkillEnum.Firemaking} icon`);
  });

  it('should map ClueScrollEnum to icon', async () => {
    fixture.componentRef.setInput('name', ClueScrollsEnum.ClueScrollsHard);
    await fixture.whenStable();

    expect(img.src).toContain('/cluescrolls/game_icon_cluescrollshard.png');
    expect(img.alt).toBe(`${ClueScrollsEnum.ClueScrollsHard} icon`);
  });

  it('should map MiniGameEnum to icon', async () => {
    fixture.componentRef.setInput('name', MiniGameEnum.SoulWarsZeal);
    await fixture.whenStable();

    expect(img.src).toContain('/minigames/game_icon_soulwarszeal.png');
    expect(img.alt).toBe(`${MiniGameEnum.SoulWarsZeal} icon`);
  });

  it('should map BountyHunterEnum to icon', async () => {
    fixture.componentRef.setInput('name', BountyHunterEnum.BountyHunterRogues);
    await fixture.whenStable();

    expect(img.src).toContain('/minigames/game_icon_bountyhunterrogue.png');
    expect(img.alt).toBe(`${BountyHunterEnum.BountyHunterRogues} icon`);
  });

  it('should map CompetitiveEnum to icon', async () => {
    fixture.componentRef.setInput('name', CompetitiveEnum.LastManStanding);
    await fixture.whenStable();

    expect(img.src).toContain('/minigames/game_icon_lmsrank.png');
    expect(img.alt).toBe(`${CompetitiveEnum.LastManStanding} icon`);
  });

  it('should map BossEnum to icon', async () => {
    fixture.componentRef.setInput('name', BossEnum.KreeArra);
    await fixture.whenStable();

    expect(img.src).toContain('/bosses/game_icon_kreearra.png');
    expect(img.alt).toBe(`${BossEnum.KreeArra} icon`);
  });

  it('should map RaidEnum to icon', async () => {
    fixture.componentRef.setInput('name', RaidEnum.TheGauntlet);
    await fixture.whenStable();

    expect(img.src).toContain('/raids/game_icon_thegauntlet.png');
    expect(img.alt).toBe(`${RaidEnum.TheGauntlet} icon`);
  });

  it('should map Wiki item names to wiki image url', async () => {
    fixture.componentRef.setInput('name', 'Abyssal whip.png');
    fixture.componentRef.setInput('wiki', true);
    await fixture.whenStable();

    expect(img.src).toBe('https://oldschool.runescape.wiki/images/Abyssal_whip.png');
    expect(img.alt).toBe('Abyssal whip icon');
  });
});
