import { _decorator, Component, Node, ScrollView, EventHandler, Prefab, instantiate, Label, Button, math, sys  } from 'cc';
const { ccclass, property } = _decorator;

const X_BEGIN: number = -440;
const Y_BEGIN: number = -100;
const GAP: number = 220;
const TOTAL_LEVEL: number = 100;
let page = 1;
let current_pack = 1;

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

    @property({ type: Label })
    public packLabel: Label | null = null;

    start() {
        if(this.chooseLevel) {
            this.chooseLevel.active = false;
        }
        //this.generatePage(page);
        
    }

    update(deltaTime: number) {
        
    }

    generatePage(page: number, pack: number) {
        this.content.destroyAllChildren();
        this.getProcess();
        let i = 0;
        let level_id = 0;
        if (pack == 0) {
            this.packLabel.string = "入门";
        }
        else if (pack == 1) {
            this.packLabel.string = "简单";
        }
        else if (pack == 2) {
            this.packLabel.string = "中等";
        }
        else if (pack == 3) {
            this.packLabel.string = "困难";
        }
        else if (pack == 4) {
            this.packLabel.string = "专家";
        }
        //console.log("process = "+ window["id"]);
        for(i = 0; i < TOTAL_LEVEL; i++)
        {
            let level: Node|null = null;
            level_id = i + 1 + (page - 1) * TOTAL_LEVEL;
            if(level_id > window["game_process"][pack])
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

    onStarterButtonClicked() {
        window["pack_id"] = 0;
        if(window["victory"] == 0)
        {
            if(this.chooseLevel) {
                this.chooseLevel.active = true;
            }
            this.generatePage(page, 0);
            console.log(window["game_process"]);
            current_pack = 0;
        }
    }

    onBeginnerButtonClicked() {
        window["pack_id"] = 1;
        if(window["victory"] == 0)
        {
            if(this.chooseLevel) {
                this.chooseLevel.active = true;
            }
            this.generatePage(page, 1);
            console.log(window["game_process"]);
            current_pack = 1;
        }
    }

    onIntermediateButtonClicked() {
        window["pack_id"] = 2;
        if(window["victory"] == 0)
        {
            if(this.chooseLevel) {
                this.chooseLevel.active = true;
            }
            this.generatePage(page, 2);
            console.log(window["game_process"]);
            current_pack = 2;
        }
    }

    onAdvancedButtonClicked() {
        window["pack_id"] = 3;
        if(window["victory"] == 0)
        {
            if(this.chooseLevel) {
                this.chooseLevel.active = true;
            }
            this.generatePage(page, 3);
            console.log(window["game_process"]);
            current_pack = 3;
        }
    }

    onExpertButtonClicked() {
        window["pack_id"] = 4;
        if(window["victory"] == 0)
        {
            if(this.chooseLevel) {
                this.chooseLevel.active = true;
            }
            this.generatePage(page, 4);
            console.log(window["game_process"]);
            current_pack = 4;
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
            this.generatePage(page, current_pack);
        }
    }

    onPrevButtonClicked() {
        if(page > 1)
        {
            page--;
            this.generatePage(page, current_pack);
        }
    }

    getProcess() {
        /*if(sys.localStorage.getItem('game_process') >= 1)
        {
            window["game_process"][0] = sys.localStorage.getItem('game_process');
        }*/

        if(sys.localStorage.getItem('starter_process') >= 1)
        {
            window["game_process"][0] = parseInt(sys.localStorage.getItem('starter_process'));
        }
    
        if(sys.localStorage.getItem('beginner_process') >= 1)
        {
            window["game_process"][1] = parseInt(sys.localStorage.getItem('beginner_process'));
        }

        if(sys.localStorage.getItem('intermediate_process') >= 1)
        {
            window["game_process"][2] = parseInt(sys.localStorage.getItem('intermediate_process'));
        }

        if(sys.localStorage.getItem('advanced_process') >= 1)
        {
            window["game_process"][3] = parseInt(sys.localStorage.getItem('advanced_process'));
        }
    
        if(sys.localStorage.getItem('expert_process') >= 1)
        {
            window["game_process"][4] = parseInt(sys.localStorage.getItem('expert_process'));
        }

    }
}

