import { _decorator, Component, Node, ScrollView, EventHandler, Prefab, instantiate, Label, Button, math, sys  } from 'cc';
const { ccclass, property } = _decorator;

const X_BEGIN: number = -440;
const Y_BEGIN: number = -100;
const GAP: number = 220;
const TOTAL_LEVEL: number = 100;
let page = 1;

@ccclass('ChooseLevel')
export class ChooseLevel extends Component {
    @property({ type: Node })
    public chooseLevel: Node | null = null;

    @property({ type: Node })
    public content: Node | null = null;

    @property({type: Prefab})
    public levelButton: Prefab|null = null;

    @property({type: Prefab})
    public lockedButton: Prefab|null = null;

    start() {
        if(this.chooseLevel) {
            this.chooseLevel.active = false;
        }
        //this.generatePage(page);
        
    }

    update(deltaTime: number) {
        
    }

    generatePage(page: number) {
        this.content.destroyAllChildren();
        this.getProcess();
        let i = 0;
        let level_id = 0;
        //console.log("process = "+ window["id"]);
        for(i = 0; i < TOTAL_LEVEL; i++)
        {
            let level: Node|null = null;
            level_id = i + 1 + (page - 1) * TOTAL_LEVEL;
            if(level_id > window["game_process"])
            {
                level = instantiate(this.lockedButton);
            }
            else
            {
                level = instantiate(this.levelButton);
            }
            
            this.content.addChild(level);
            level.setPosition(X_BEGIN + GAP * (i % 5), Y_BEGIN - GAP * Math.floor(i / 5));

            let button: Button|null = null;
            button = level.getComponentInChildren(Button);
            let label: Label | null = null;
            label = button.getComponentInChildren(Label);
            label.string = (i + 1 + (page - 1) * TOTAL_LEVEL).toString();
        }
    }

    onChooseButtonClicked() {
        if(window["victory"] == 0)
        {
            if(this.chooseLevel) {
                this.chooseLevel.active = true;
            }
            this.generatePage(page);
        }
    }

    onChooseCloseButtonClicked() {
        if(this.chooseLevel) {
            this.chooseLevel.active = false;
        }
    }

    onNextButtonClicked() {
        if(page < 10)
        {
            page++;
            this.generatePage(page);
        }
    }

    onPrevButtonClicked() {
        if(page > 1)
        {
            page--;
            this.generatePage(page);
        }
    }

    getProcess() {
        if(sys.localStorage.getItem('game_process') >= 1)
        {
            window["game_process"] = sys.localStorage.getItem('game_process');
        }
        //window["id"] = window["game_process"];
        //console.log("level id = " + window["id"]);
    }
}

