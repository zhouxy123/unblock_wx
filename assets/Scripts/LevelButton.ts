import { _decorator, Component, Node, Label } from 'cc';
const { ccclass, property } = _decorator;

let new_level : number = 0;
window["new_level"] = new_level;

@ccclass('LevelButton')
export class LevelButton extends Component {
    @property({ type: Label })
    public levelIdLabel: Label | null = null;

    @property({ type: Node })
    public chooseLevel: Node | null = null;

    start() {

    }

    update(deltaTime: number) {
        
    }

    onChooseLevelButtonClicked() {
        window["new_level"] = parseInt(this.levelIdLabel.string);
    }

}

