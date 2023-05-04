import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PlayerType } from '@osrs-tracker/models';
import {
  BossEnum,
  BountyHunterEnum,
  ClueScrollsEnum,
  CompetitiveEnum,
  MiniGameEnum,
  RaidEnum,
  SkillEnum,
} from 'src/app/common/services/hiscores/hiscore.enum';
import { IconDirective } from './icon.directive';

@Component({
  template: '<img icon [name]="name" [wiki]="wiki">',
})
class TestComponent {
  @Input() name: string;
  @Input() wiki: boolean;
}

describe('IconDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let img: HTMLImageElement;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      imports: [IconDirective],
      declarations: [TestComponent],
    }).createComponent(TestComponent);

    fixture.detectChanges(); // initial binding

    img = fixture.debugElement.query(By.directive(IconDirective)).nativeElement;
  });

  it('should add icon styling and lazy loading to element', () => {
    expect(img.loading).toBe('lazy');
    expect(img.style.imageRendering).toBe('pixelated');
  });

  it('should map "coins" to icon', () => {
    fixture.componentInstance.name = 'coins';
    fixture.detectChanges();
    expect(img.src).toContain('/coins.png');
    expect(img.alt).toBe('coins icon');
  });

  it('should map "combat" to icon', () => {
    fixture.componentInstance.name = 'combat';
    fixture.detectChanges();
    expect(img.src).toContain('/combat.png');
    expect(img.alt).toBe('combat icon');
  });

  it('should map "dead" to icon', () => {
    fixture.componentInstance.name = 'dead';
    fixture.detectChanges();
    expect(img.src).toContain('/skull.png');
    expect(img.alt).toBe('dead icon');
  });

  it('should map PlayerTypeEnum to icon', () => {
    fixture.componentInstance.name = PlayerType.Ironman;
    fixture.detectChanges();
    expect(img.src).toContain('/player_type/ironman.png');
    expect(img.alt).toBe(`${PlayerType.Ironman} icon`);
  });

  it('should map SkillEnum to icon', () => {
    fixture.componentInstance.name = SkillEnum.Firemaking;
    fixture.detectChanges();
    expect(img.src).toContain('/skills/skill_icon_firemaking1.gif');
    expect(img.alt).toBe(`${SkillEnum.Firemaking} icon`);
  });

  it('should map ClueScrollEnum to icon', () => {
    fixture.componentInstance.name = ClueScrollsEnum.ClueScrollsHard;
    fixture.detectChanges();
    expect(img.src).toContain('/cluescrolls/game_icon_cluescrollshard.png');
    expect(img.alt).toBe(`${ClueScrollsEnum.ClueScrollsHard} icon`);
  });

  it('should map MiniGameEnum to icon', () => {
    fixture.componentInstance.name = MiniGameEnum.SoulWarsZeal;
    fixture.detectChanges();
    expect(img.src).toContain('/minigames/game_icon_soulwarszeal.png');
    expect(img.alt).toBe(`${MiniGameEnum.SoulWarsZeal} icon`);
  });

  it('should map BountyHunterEnum to icon', () => {
    fixture.componentInstance.name = BountyHunterEnum.BountyHunterRogues;
    fixture.detectChanges();
    expect(img.src).toContain('/minigames/game_icon_bountyhunterrogue.png');
    expect(img.alt).toBe(`${BountyHunterEnum.BountyHunterRogues} icon`);
  });

  it('should map CompetitiveEnum to icon', () => {
    fixture.componentInstance.name = CompetitiveEnum.LastManStanding;
    fixture.detectChanges();
    expect(img.src).toContain('/minigames/game_icon_lmsrank.png');
    expect(img.alt).toBe(`${CompetitiveEnum.LastManStanding} icon`);
  });

  it('should map BossEnum to icon', () => {
    fixture.componentInstance.name = BossEnum.KreeArra;
    fixture.detectChanges();
    expect(img.src).toContain('/bosses/game_icon_kreearra.png');
    expect(img.alt).toBe(`${BossEnum.KreeArra} icon`);
  });

  it('should map RaidEnum to icon', () => {
    fixture.componentInstance.name = RaidEnum.TheGauntlet;
    fixture.detectChanges();
    expect(img.src).toContain('/raids/game_icon_thegauntlet.png');
    expect(img.alt).toBe(`${RaidEnum.TheGauntlet} icon`);
  });

  it('should map Wiki item names to wiki image url', () => {
    fixture.componentInstance.name = 'Abyssal whip.png';
    fixture.componentInstance.wiki = true;

    fixture.detectChanges();
    expect(img.src).toBe('https://oldschool.runescape.wiki/images/Abyssal_whip.png');
    expect(img.alt).toBe('Abyssal whip icon');
  });
});
