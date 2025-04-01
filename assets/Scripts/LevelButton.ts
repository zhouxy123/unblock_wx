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

    /*
    @property({ type: Node })
    public mainMenu : Node | null = null;

    @property({ type: Node })
    public choosePackMenu: Node | null = null;
    */

    start() {

    }

    update(deltaTime: number) {
        
    }

    onChooseLevelButtonClicked() {
        window["if_first"] = 0;
        window["new_level"] = parseInt(this.levelIdLabel.string) + 1000 * window["pack_id"];
        window["id"] = window["new_level"];
        console.log("choosed level:" + window["id"]);
        /*
        if(this.mainMenu) {
            this.mainMenu.active = false;
        }
        if(this.choosePackMenu) {
            this.choosePackMenu.active = false; 
        }*/
        //window["id"] = window["new_level"];
        // this.setCurState(GameState.STATE_INIT);
    }

}

