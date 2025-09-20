import { _decorator, Component, instantiate, Label, Node, Prefab, TextAsset, Scene, sys, Vec3 } from 'cc';
import Drag from './Drag';
import { ConfettiController } from './ConfettiController';
import "miniprogram-api-typings";

// initWasm: 从../resources/wasm/solver.js中默认导出，对应export default function  
// {solve}: 必须与solver.js中对应函数名一致
import initWasm, {solve} from "../resources/wasm/solver.js";

const { ccclass, property } = _decorator;

enum GameState {
    STATE_INIT,
    STATE_PLAYING,
    STATE_END,
    STATE_GUIDE,
};

let blocks: number[][] = [];
let total_state: number[][] = 
    [[0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0]];
let block_state: number[][] = [];
let abs_coords: number[][] = [];
let victory: number = 0;
let level_id = 1;
let steps : number = 0;
let if_first: number = 1; // 是否刚进入游戏？是：加载进度
let new_level : number = 0;
let pack_id: number = 0; // 难度等级
let game_process: number[] = [1, 1, 1, 1, 1]; // 对应入门、简单、中等、困难、专家五种难度
let help_open: number = 0;
let confetti: number = 0;


// const LEVEL_ID: number = 3; 
const BLOCK_SIZE: number = 180;
const LEFT_BORDER: number = 90;
const UP_BORDER: number = 890;
const BOUNDING_BOX_POS: number = 140; // 调整边界框位置，用于guide模式

window["blocks"] = blocks; // 目的：把blocks弄成全局变量
window["total_state"] = total_state;
window["block_state"] = block_state;
window["abs_coords"] = abs_coords;
window["victory"] = victory;
window["steps"] = steps;
window["id"] = level_id;
window["game_process"] = game_process;
window["new_level"] = new_level;
window["if_first"] = if_first;
window["pack_id"] = pack_id;
window["confetti"] = confetti;

@ccclass('GameManager')
export class GameManager extends Component {
    // 引导模式数据
    private guideSteps: Array<{ block_id: number; delta: number }> = 
    //[{"block_id":7,"delta":-1},{"block_id":3,"delta":-1},{"block_id":4,"delta":-1},{"block_id":11,"delta":1},{"block_id":0,"delta":1}];
    [{"block_id":8,"delta":1},{"block_id":3,"delta":-1},{"block_id":1,"delta":-1},{"block_id":11,"delta":-1},{"block_id":0,"delta":2}];
    private guideIndex: number = 0;
    private inGuide: boolean = false;
    private targetGridX: number | null = null;
    private targetGridY: number | null = null;
    private targetPos1: Vec3 | null = null;
    private targetPos2: Vec3 | null = null;
    private guideCurrentMarker: Node | null = null;
    private guideTargetMarker1: Node | null = null; // 较近端点
    private guideTargetMarker2: Node | null = null; // 较远端点

    @property({ type: Node })
    public mainMenu : Node | null = null;
    
    @property({type: Prefab})
    public mainBlock: Prefab|null = null;

    @property({type: Prefab})
    public rowBlock2: Prefab|null = null;

    @property({type: Prefab})
    public colBlock2: Prefab|null = null;

    @property({type: Prefab})
    public rowBlock3: Prefab|null = null;

    @property({type: Prefab})
    public boundingBox: Prefab|null = null;

    @property({type: Prefab})
    public dragGuide: Prefab|null = null;

    @property({type: Prefab})
    public colBlock3: Prefab|null = null;

    @property({ type: Node })
    public choosePackMenu: Node | null = null;

    @property({ type: Node })
    public helpMenu: Node | null = null;

    @property({ type: Node })
    public victoryMenu: Node | null = null;

    @property({ type: Label })
    public levelLabel: Label | null = null;

    @property({ type: Label })
    public stepLabel: Label | null = null;

    @property({ type: Node })
    public chooseLevel: Node | null = null;

    @property({ type: Node })
    public controlTable: Node | null = null;

    @property({ type: Node })
    public LevelTable: Node | null = null;

    @property({ type: Label })
    public levelIdLabel: Label | null = null;

    @property({type: Prefab})
    public confettiPrefab: Prefab|null = null;

    @property({ type: Node })
    public upperNode: Node | null = null;


    // 声明属性 ‘itemGiftText‘ 的类型为 TextAsset
    @property(TextAsset)
    itemGiftText: TextAsset = null!;

    @property(TextAsset)
    processText: TextAsset = null!;

    //private wasmExports: any = null;  // 保存 wasm 导出的对象

    async start() {
        this.displayMainMenu();
        // 授权显示菜单
        
        wx.showShareMenu({
        menus: ['shareAppMessage', 'shareTimeline']
      });

        // 初始化wasm
        try {
            await initWasm();
            console.log("[OK] wasm init successful");
        } catch (e) {
            console.error("[ERR] wasm init failed:", e);
        }
    }

    init() {
        
        if(window["if_first"] == 1) {
            this.getProcess();
            window["if_first"] = 0;
        }
        //window["id"] = 4800;

        if(this.victoryMenu) {
            this.victoryMenu.active = false;
        } // 初始化不显示胜利界面

        if(this.helpMenu) {
            this.helpMenu.active = false; 
            help_open = 0;
        }

        if(this.levelLabel) {
            if(window["id"] <= 1000) {
                this.levelLabel.string = "关卡：1-" + window["id"];
            }
            else if(window["id"] <= 2000) {
                this.levelLabel.string = "关卡：2-" + (window["id"] - 1000);
            }
            else if(window["id"] <= 3000) {
                this.levelLabel.string = "关卡：3-" + (window["id"] - 2000);
            }
            else if(window["id"] <= 4000) {
                this.levelLabel.string = "关卡：4-" + (window["id"] - 3000);
            }
            else {
                this.levelLabel.string = "关卡：5-" + (window["id"] - 4000);
            }
            
        }

        if(this.stepLabel) {
            this.stepLabel.string = "步数：0";
        }

        if(this.controlTable) {
            this.controlTable.active = true;
        }

        if(this.LevelTable) {
            this.LevelTable.active = true;
        }

        victory = 0;
        window["steps"] = 0;

        this.generate(window["id"]);
        // level_id = level_id % 1000 + 1;
        console.log(window["blocks"]);
        this.setCurState(GameState.STATE_PLAYING);
    }

    update(deltaTime: number) {
        if(window["confetti"] == 1) {
            this.schedule(this.spawnConfetti, 0.1); // 每隔0.1s生成一个彩纸屑动画
            this.scheduleOnce(() => {
                this.unschedule(this.spawnConfetti);
            }, 3); // 3s后停止生成
            window["confetti"] = 0;
        }

        if(window["victory"] == 1)
        {
            this.setCurState(GameState.STATE_END);
            if(this.victoryMenu) {
                this.victoryMenu.active = true;
            }
        }

        if(this.stepLabel) {
            this.stepLabel.string = "步数：" + window["steps"];
        }

        if(window["new_level"] != 0)
        {
            window["id"] = window["new_level"];
            this.setCurState(GameState.STATE_INIT);
            if(this.chooseLevel) {
                this.chooseLevel.active = false;
            }
            if(this.choosePackMenu) {
                this.choosePackMenu.active = false; 
            }
            window["new_level"] = 0;

        }
    }

    onLoad() {
        // 监听来自方块的完成移动事件
        this.node.on('guide_move', this.onGuideMove, this);
    }

    setCurState(value: GameState) {
        switch(value) {
            case GameState.STATE_INIT:
                this.inGuide = false;
                this.init();
                break;
            case GameState.STATE_PLAYING:  
                //this.checkVictory();
                break;
            case GameState.STATE_END:
                // 待添加：点击next level按钮，进入init状态
                break;
            case GameState.STATE_GUIDE:
                // 进入引导模式
                console.log("enter guide mode ...");
                this.inGuide = true;
                // 如果已有解法步骤，则只解锁当前步骤对应的方块
                if (this.guideSteps && this.guideSteps.length > 0) {
                    const current = this.guideSteps[this.guideIndex];
                    this.lockAllExcept(current.block_id);
                    this.updateGuideMarkersForCurrentStep();
                }
                console.log("guide mode successful");
                break;
        }
    }

    // 禁用指定 id 方块的 Drag 交互（若无 Drag 则暂停系统事件）
    private lockBlockById(id: number) {
        const children = this.node.children;
        if (!children || id < 0 || id >= children.length) {
            return;
        }
        const target = children[id];
        if (!target) return;
        // 优先禁用 Drag 组件
        const dragOnSelf = target.getComponent(Drag);
        if (dragOnSelf) {
            dragOnSelf.enabled = false;
        }
        // 兼容 prefab 内部子节点绑定 Drag 的情况
        const dragList = target.getComponentsInChildren(Drag);
        if (dragList && dragList.length > 0) {
            dragList.forEach(d => d.enabled = false);
        }
        // 兜底暂停系统事件，防止触摸继续派发
        target.pauseSystemEvents(true);
    }

    // 解除指定 id 方块的 Drag 锁定，并恢复系统事件
    private unlockBlockById(id: number) {
        const children = this.node.children;
        if (!children || id < 0 || id >= children.length) {
            return;
        }
        const target = children[id];
        if (!target) return;
        // 恢复 Drag 组件
        const dragOnSelf = target.getComponent(Drag);
        if (dragOnSelf) {
            dragOnSelf.enabled = true;
        }
        const dragList = target.getComponentsInChildren(Drag);
        if (dragList && dragList.length > 0) {
            dragList.forEach(d => d.enabled = true);
        }
        // 恢复系统事件
        target.resumeSystemEvents(true);
    }

    // 只允许指定 id 的方块可交互，其余全部锁定
    private lockAllExcept(allowedId: number) {
        const children = this.node.children;
        if (!children) return;
        for (let i = 0; i < children.length; i++) {
            if (i === allowedId) {
                // 解锁允许的方块
                this.unlockBlockById(i);
            } else {
                this.lockBlockById(i);
            }
        }
    }

    // 解锁全部方块
    private unlockAllBlocks() {
        const children = this.node.children;
        if (!children) return;
        for (let i = 0; i < children.length; i++) {
            this.unlockBlockById(i);
        }
    }

    // 外部开始引导：传入解法步骤数组 [{block_id, delta}, ...]
    public beginGuide(steps: Array<{ block_id: number; delta: number }>) {
        this.guideSteps = steps || [];
        this.guideIndex = 0;
        this.inGuide = true;
        this.setCurState(GameState.STATE_GUIDE);
    }

    // 方块完成移动时的回调（由 Drag 派发）
    private onGuideMove(payload: { blockId: number; delta: number }) {
        console.log("onGuideMove: " + payload.blockId + " " + payload.delta);
        if (!this.inGuide || !this.guideSteps || this.guideSteps.length === 0) return;
        const cur = this.guideSteps[this.guideIndex];
        if (!cur) return;
        if (payload.blockId !== cur.block_id) return;

        // 基于网格坐标判断是否到达目标
        const id = cur.block_id;
        const gridX = window["blocks"][id][0];
        const gridY = window["blocks"][id][1];
        const reachedX = this.targetGridX != null && gridX === this.targetGridX;
        const reachedY = this.targetGridY != null && gridY === this.targetGridY;
        const reached = reachedX || reachedY; // 横向只看 X，纵向只看 Y
        if (!reached) return;

        // 命中目标，进入下一步
        this.guideIndex++;
        if (this.guideIndex >= this.guideSteps.length) {
            this.finishGuide();
            return;
        }
        const next = this.guideSteps[this.guideIndex];
        this.lockAllExcept(next.block_id);
        this.updateGuideMarkersForCurrentStep();
    }

    private finishGuide() {
        this.inGuide = false;
        this.unlockAllBlocks();
        this.clearGuideMarkers();
        // 可选：切回 PLAYING 状态
        this.setCurState(GameState.STATE_PLAYING);
    }

    private clearGuideMarkers() {
        if (this.guideCurrentMarker) {
            this.guideCurrentMarker.destroy();
            this.guideCurrentMarker = null;
        }
        if (this.guideTargetMarker1) {
            this.guideTargetMarker1.destroy();
            this.guideTargetMarker1 = null;
        }
        if (this.guideTargetMarker2) {
            this.guideTargetMarker2.destroy();
            this.guideTargetMarker2 = null;
        }
    }

    private ensureMarkers() {
        const parent = this.node;
        const needNewCurrent = !this.guideCurrentMarker || !this.guideCurrentMarker.isValid;
        const needNewTarget1  = !this.guideTargetMarker1  || !this.guideTargetMarker1.isValid;
        const needNewTarget2  = !this.guideTargetMarker2  || !this.guideTargetMarker2.isValid;
      
        if (needNewCurrent && this.dragGuide) {
          this.guideCurrentMarker = instantiate(this.dragGuide);
          parent.addChild(this.guideCurrentMarker);
        }
        if (needNewTarget1 && this.boundingBox) {
          this.guideTargetMarker1 = instantiate(this.boundingBox); // 较近端点
          parent.addChild(this.guideTargetMarker1);
        }
        if (needNewTarget2 && this.boundingBox) {
          this.guideTargetMarker2 = instantiate(this.boundingBox); // 较远端点
          parent.addChild(this.guideTargetMarker2);
        }
      }

    private updateGuideMarkersForCurrentStep() {
        if (!this.inGuide || !this.guideSteps || this.guideSteps.length === 0) {
            this.clearGuideMarkers();
            return;
        }
        const step = this.guideSteps[this.guideIndex];
        const id = step.block_id;
        const delta = step.delta;
        const children = this.node.children;
        if (!children || id < 0 || id >= children.length) return;
        const targetNode = children[id];

        // 确保标记存在
        this.ensureMarkers();
        //console.log("guideCurrentMarker: " + this.guideCurrentMarker);
        //console.log("guideTargetMarker2: " + this.guideTargetMarker2);
        if (!this.guideCurrentMarker || !this.guideTargetMarker1 || !this.guideTargetMarker2) return;
        // 先重置为默认方向，避免上一轮旋转残留
        this.guideCurrentMarker.setRotationFromEuler(0, 0, 0);
        this.guideTargetMarker1.setRotationFromEuler(0, 0, 0);
        this.guideTargetMarker2.setRotationFromEuler(0, 0, 0);

        // 当前方块位置
        // const curPos = targetNode.position.clone();
        const cur_x_abs = window["abs_coords"][id][0];
        const cur_y_abs = window["abs_coords"][id][1];
        const curPos = new Vec3(cur_x_abs, cur_y_abs, 0);
        this.guideCurrentMarker.setPosition(curPos);

        // 计算目标位置（基于 delta 与方向）
        const dir = window["blocks"][id][3]; // 0: 横向，1: 纵向
        const len = window["blocks"][id][2]; // 块长
        let tgtPos1 = curPos.clone();
        let tgtPos2 = curPos.clone();
        if (dir === 0 && delta > 0) { // 横向，向右
            this.guideTargetMarker2.setRotationFromEuler(0, 0, 180);
            if(len === 2) {
                tgtPos1 = new Vec3(curPos.x + delta * BLOCK_SIZE - BOUNDING_BOX_POS, curPos.y, curPos.z);
                tgtPos2 = new Vec3(curPos.x + delta * BLOCK_SIZE + BOUNDING_BOX_POS, curPos.y, curPos.z);
            }
            else {
                tgtPos1 = new Vec3(curPos.x + delta * BLOCK_SIZE - BOUNDING_BOX_POS - (BLOCK_SIZE / 2), curPos.y, curPos.z);
                tgtPos2 = new Vec3(curPos.x + delta * BLOCK_SIZE + BOUNDING_BOX_POS + (BLOCK_SIZE / 2), curPos.y, curPos.z);
            }
        } 
        else if (dir === 0 && delta < 0) { // 横向，向左
            this.guideCurrentMarker.setRotationFromEuler(0, 0, 180);
            this.guideTargetMarker1.setRotationFromEuler(0, 0, 180);
            if(len === 2) {
                tgtPos1 = new Vec3(curPos.x + delta * BLOCK_SIZE + BOUNDING_BOX_POS, curPos.y, curPos.z);
                tgtPos2 = new Vec3(curPos.x + delta * BLOCK_SIZE - BOUNDING_BOX_POS, curPos.y, curPos.z);
            }
            else {
                tgtPos1 = new Vec3(curPos.x + delta * BLOCK_SIZE + BOUNDING_BOX_POS + (BLOCK_SIZE / 2), curPos.y, curPos.z);
                tgtPos2 = new Vec3(curPos.x + delta * BLOCK_SIZE - BOUNDING_BOX_POS - (BLOCK_SIZE / 2), curPos.y, curPos.z);
            }
        }
        else if (dir === 1 && delta < 0) { // 纵向，向上
            this.guideTargetMarker1.setRotationFromEuler(0, 0, 90);
            this.guideTargetMarker2.setRotationFromEuler(0, 0, 270);
            this.guideCurrentMarker.setRotationFromEuler(0, 0, 90);
            if(len === 2) {
                tgtPos1 = new Vec3(curPos.x, curPos.y + (-delta) * BLOCK_SIZE - BOUNDING_BOX_POS, curPos.z);
                tgtPos2 = new Vec3(curPos.x, curPos.y + (-delta) * BLOCK_SIZE + BOUNDING_BOX_POS, curPos.z);
            }
            else {
                tgtPos1 = new Vec3(curPos.x, curPos.y + (-delta) * BLOCK_SIZE - BOUNDING_BOX_POS - (BLOCK_SIZE / 2), curPos.z);
                tgtPos2 = new Vec3(curPos.x, curPos.y + (-delta) * BLOCK_SIZE + BOUNDING_BOX_POS + (BLOCK_SIZE / 2), curPos.z);
            }
        }
        else if (dir === 1 && delta > 0) { // 纵向，向下
            this.guideTargetMarker1.setRotationFromEuler(0, 0, 270);
            this.guideTargetMarker2.setRotationFromEuler(0, 0, 90);
            this.guideCurrentMarker.setRotationFromEuler(0, 0, 270);
            if(len === 2) {
                tgtPos1 = new Vec3(curPos.x, curPos.y + (-delta) * BLOCK_SIZE + BOUNDING_BOX_POS, curPos.z);
                tgtPos2 = new Vec3(curPos.x, curPos.y + (-delta) * BLOCK_SIZE - BOUNDING_BOX_POS, curPos.z);
            }
            else {
                tgtPos1 = new Vec3(curPos.x, curPos.y + (-delta) * BLOCK_SIZE + BOUNDING_BOX_POS + (BLOCK_SIZE / 2), curPos.z);
                tgtPos2 = new Vec3(curPos.x, curPos.y + (-delta) * BLOCK_SIZE - BOUNDING_BOX_POS - (BLOCK_SIZE / 2), curPos.z);
            }
        }
        this.guideTargetMarker1.setPosition(tgtPos1);
        this.guideTargetMarker2.setPosition(tgtPos2);
        this.targetPos1 = tgtPos1;
        this.targetPos2 = tgtPos2;

        // 记录目标网格坐标（基于 blocks 的网格系）
        // 水平移动影响 x，垂直移动影响 y。
        this.targetGridX = null;
        this.targetGridY = null;
        if (dir === 0) {
            // 横向块：目标 x = 当前 x + delta
            const curGridX = window["blocks"][id][0];
            this.targetGridX = curGridX + delta;
        } else {
            // 纵向块：目标 y = 当前 y + (-delta)
            const curGridY = window["blocks"][id][1];
            this.targetGridY = curGridY + delta;
        }
    }

    getProcess() {
        // 分别处理五种难度
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

        window["id"] = window["game_process"][0];
        console.log("level id = " + window["id"]);
        console.log("Process:" + window["game_process"])
    }

    generate(level: number) {
        console.log("generate level: " + level);
        const data: string = this.itemGiftText.text;
        let i = 0;
        let j = (level - 1) * 64;

        this.clearGuideMarkers();
        this.node.destroyAllChildren();

        window["blocks"] = [];
        window["block_state"] = [];
        window["abs_coords"] = [];
        window["total_state"] = 
            [[0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0]];
        window["victory"] = 0;

        while(data[j] != '*' && i < 16) {
            window["blocks"][i] = [];
            window["blocks"][i][0] = parseInt(data[j]);   // x
            window["blocks"][i][1] = parseInt(data[j + 1]);   // y
            window["blocks"][i][2] = parseInt(data[j + 2]);   // block length
            window["blocks"][i][3] = parseInt(data[j + 3]);   // block direction

            window["block_state"][i] = [];

            let dir = window["blocks"][i][3];
            let len = window["blocks"][i][2];
            window["block_state"][i][0] = dir; // 方向 0:横 1:竖
            window["block_state"][i][1] = window["blocks"][i][1-dir]; // 不动方向的坐标 横:y 竖:x （横块y不动，竖块x不动）
            window["block_state"][i][2] = window["blocks"][i][dir]; // 可动方向的坐标（范围）
            window["block_state"][i][3] = window["blocks"][i][dir] + len - 1;

            i++;
            j += 4;
        }
        

        for(i = 0; i < window["blocks"].length; i++) {
            let block: Node|null = null;
            let x = window["blocks"][i][0];
            let y = window["blocks"][i][1];
            let len = window["blocks"][i][2];
            let dir = window["blocks"][i][3];

            let abs_x = 0;
            let abs_y = 0;
            window["abs_coords"][i] = [];

            if(i == 0) {
                block = instantiate(this.mainBlock);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER;
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER;
                block.setPosition(abs_x, abs_y, 0);

                window["total_state"][y][x] = 2;
                window["total_state"][y][x + 1] = 2;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 2 && dir == 0) // 横2
            {
                block = instantiate(this.rowBlock2);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER;
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER;
                block.setPosition(BLOCK_SIZE * x + LEFT_BORDER, -1 * BLOCK_SIZE * y + UP_BORDER, 0);

                window["total_state"][y][x] = 1;
                window["total_state"][y][x + 1] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 2 && dir == 1) // 竖2
            {
                block = instantiate(this.colBlock2);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER - (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER - (BLOCK_SIZE / 2);
                block.setPosition(abs_x, abs_y, 0);

                window["total_state"][y][x] = 1;
                window["total_state"][y + 1][x] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 3 && dir == 0) // 横3
            {
                block = instantiate(this.rowBlock3);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER + (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER;
                block.setPosition(abs_x, abs_y, 0);

                window["total_state"][y][x] = 1;
                window["total_state"][y][x + 1] = 1;
                window["total_state"][y][x + 2] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 3 && dir == 1) // 竖3
            {
                block = instantiate(this.colBlock3);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER - (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER - BLOCK_SIZE;
                block.setPosition(abs_x, abs_y, 0);

                window["total_state"][y][x] = 1;
                window["total_state"][y + 1][x] = 1;
                window["total_state"][y + 2][x] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
        }
    }

    displayMainMenu() {
        if(this.mainMenu) {
            this.mainMenu.active = true;
        }
        if(this.choosePackMenu) {
            this.choosePackMenu.active = false; 
        }
        if(this.helpMenu) {
            this.helpMenu.active = false; 
        }
        if(this.victoryMenu) {
            this.victoryMenu.active = false;
        }
        if(this.controlTable) {
            this.controlTable.active = false;
        }
        if(this.LevelTable) {
            this.LevelTable.active = false;
        }
    }

    displayChoosePackMenu() {
        if(this.mainMenu) {
            this.mainMenu.active = false;
        }
        if(this.choosePackMenu) {
            this.choosePackMenu.active = true; 
        }
        if(this.helpMenu) {
            this.helpMenu.active = false; 
        }
        if(this.victoryMenu) {
            this.victoryMenu.active = false;
        }
        if(this.controlTable) {
            this.controlTable.active = false;
        }
        if(this.LevelTable) {
            this.LevelTable.active = false;
        }
    }

    onStartButtonClicked() {   
        if(help_open == 0) {
            if(this.mainMenu) {
                this.mainMenu.active = false;
            }
            this.setCurState(GameState.STATE_INIT);
        }
    }

    onChoosePackButtonClicked() {
        if (window["victory"] == 0) {
            if(this.victoryMenu) {
                this.victoryMenu.active = false;
            }
            if(help_open == 0) { 
                this.displayChoosePackMenu();
            }
        }
    }

    onNextButtonClicked() {   
        //window["id"] = window["id"] % 1000 + 1;
        this.setCurState(GameState.STATE_INIT);
        this.unschedule(this.spawnConfetti);
        window["confetti"] = 0;
    }

    onHomeButtonClicked() {
        if(window["victory"] == 0) {
            if(this.victoryMenu) {
                this.victoryMenu.active = false;
            }
            if(help_open == 0) {
                this.displayMainMenu();
            }
        }
    }

    onRestartButtonClicked() {   
        if(window["victory"] == 0 && help_open == 0)
        {
            this.setCurState(GameState.STATE_INIT);
        }
    }

    onHelpButtonClicked() { 
        if(window["victory"] == 0)  
        {
            if(this.helpMenu) {
                this.helpMenu.active = true;
            }
            help_open = 1;
        }
    }

    onCloseHelpButtonClicked() {
        if(this.helpMenu) {
            this.helpMenu.active = false;
            help_open = 0;
        }
    }

    
    async solve(blockStr: string): Promise<string> {
        //const result: string = solve("022022214121102104213430");
        const result: string = solve(blockStr);
        return result;
    }

    /*async runSolver() {
        
        console.log("Result:", result);
    }*/
    blocksToStr(arr: number[][]) {
        const blockStr = arr.map(row => row.join("")).join("");
        return blockStr;
    }

    // 结合wasm，生成当前布局解法
    async onSolveButtonClicked() {
        if(this.inGuide) {
            return;
        }
        // 获取当前布局并适配rust求解器要求的输入格式
        console.log("solving...");
        console.log(window["blocks"]);
        let blockStr = this.blocksToStr(window["blocks"]);
        console.log(blockStr);
        try {
            const result = await this.solve(blockStr);
            console.log("solution:", result);
            // 将求解器返回的字符串转换为 guideSteps 同构的数组
            let steps: Array<{ block_id: number; delta: number }> | null = null;
            try {
                const parsed = JSON.parse(result);
                if (Array.isArray(parsed)) {
                    steps = parsed.map((s: any) => ({ block_id: Number(s.block_id), delta: Number(s.delta) }));
                }
            } catch (e) {
                console.warn('parse solution failed, fallback to test steps');
            }
            // 进入引导模式
            if (steps && steps.length > 0) {
                this.beginGuide(steps);
            } else {
                this.beginGuide(this.guideSteps);
            }
        } catch (e) {
            console.error("solve failed:", e);
            // 失败时仍可用预置步骤进入引导
            this.beginGuide(this.guideSteps);
        }

    }

    spawnConfetti() {
        const confettiRoot = instantiate(this.confettiPrefab); // 预制体
        this.victoryMenu.addChild(confettiRoot); // 挂载到当前 UI/游戏场景
        confettiRoot.setSiblingIndex(this.node.children.length - 1);// 将 confettiRoot 移动到父节点的最高层，保证显示在最上方
        confettiRoot.getComponent(ConfettiController).startConfettiAnimation(); // 开始彩纸屑动画

        setTimeout(() => {
            confettiRoot.destroy();
        }, 2000); // 2秒后销毁
    }
}

