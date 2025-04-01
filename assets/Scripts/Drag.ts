import { _decorator, Component, Node, Label, EventTouch, Vec2, absMax, sys, Animation, AnimationState } from 'cc';

const { ccclass, property } = _decorator;

const BLOCK_SIZE: number = 180;
const LEFT_BORDER: number = 90;
const UP_BORDER: number = 890;

@ccclass
export default class Drag extends Component {

    private blockType: number = 0;
    private blockID: number = -1;
    private max_right: number = 0;
    private max_left: number = 0;
    private max_up: number = 0;
    private max_down: number = 0;
    private begin_x: number = 0;
    private begin_y: number = 0;
    private step: number = 0;
    private lock: number = 0;

    @property(Animation)
    VictoryAnim: Animation = null;

    onLoad() {
        // 初始化拖动
        this.getBlockType();
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        //console.log(window["state"]);
    }

    onTouchStart(event: EventTouch) {
        if(window["victory"] == 1)
        {
            // 胜利后不能再操作
            return;
        }

        this.lock = 0; // 解除锁定
        // 记录开始触摸的位置
        this.startPos = event.getLocation();
        let id = this.getBlockID(this.node.position.x, this.node.position.y);
        if(id == -1)
        {
            return;
        }
        this.blockID = id;
        this.getMaxStep(id);
        console.log(this.max_right + " " + this.max_left + " " + this.max_down + " " + this.max_up);

        this.begin_x = this.node.position.x;
        this.begin_y = this.node.position.y;
        console.log(window["total_state"]);
        console.log("start id:" + id);
    }
 
    onTouchMove(event: EventTouch) {
        if(window["victory"] == 1)
        {
            // 胜利后不能再操作
            return;
        }
        // 计算移动的偏移量
        let delta = event.getDelta();
        // 更新节点位置
        let last_x = this.node.position.x;
        let last_y = this.node.position.y;
        let cur_x = last_x + delta.x; // last_x = cur_x - dx;
        let cur_y = last_y + delta.y;

        // begin_x,begin_y记录选中时的坐标
        // cur_x,cur_y记录move后的当前坐标
        // last_x,last_y记录本次移动之前块的坐标

        if(this.lock == 1)
            return;

        // 对块类型分类讨论
        if(this.blockType == 1 || this.blockType == 3 || this.blockType == 5)
        {
            if(cur_x - this.begin_x > 0) // 右移
            {
                if(cur_x - this.begin_x > this.max_right * BLOCK_SIZE)
                {
                    cur_x = this.begin_x + this.max_right * BLOCK_SIZE;
                    this.node.setPosition(cur_x, this.begin_y);
                    this.step = this.max_right;
                    //console.log(this.blockID);
                    if(this.step != 0) 
                       window["steps"]++;

                    this.updateState();
                    this.step = 0;
                    this.lock = 1;
                }
            }
            else // 左移
            {
                if(this.begin_x - cur_x > this.max_left * BLOCK_SIZE)
                {
                    cur_x = this.begin_x - this.max_left * BLOCK_SIZE;
                    this.node.setPosition(cur_x, this.begin_y);
                    this.step = -1 * this.max_left;
                    //console.log(this.blockID);
                    if(this.step != 0) 
                        window["steps"]++;
                    this.updateState();
                    this.step = 0;
                    this.lock = 1;
                }
            }
            this.node.setPosition(cur_x, this.begin_y);
        }
    
        if(this.blockType == 2 || this.blockType == 4)
        {   
            if(cur_y - this.begin_y > 0) // 上移
            {
                if(cur_y - this.begin_y > this.max_up * BLOCK_SIZE)
                {
                    cur_y = this.begin_y + this.max_up * BLOCK_SIZE;
                    this.node.setPosition(this.begin_x, cur_y);
                    this.step = -1 * this.max_up;
                    //console.log(this.blockID);
                    if(this.step != 0) 
                        window["steps"]++;
                    this.updateState();
                    this.step = 0;
                    this.lock = 1;
                }
            }
            else // 下移
            {
                if(this.begin_y - cur_y > this.max_down * BLOCK_SIZE)
                {
                    cur_y = this.begin_y - this.max_down * BLOCK_SIZE;
                    this.node.setPosition(this.begin_x, cur_y);
                    this.step = this.max_down;
                    //console.log(this.blockID);
                    if(this.step != 0) 
                        window["steps"]++;
                    this.updateState();
                    this.step = 0;
                    this.lock = 1;
                }
            }

            this.node.setPosition(this.begin_x, cur_y);
        }
    }
 
    onTouchEnd(event: EventTouch) {
        if(window["victory"] == 1)
        {
            // 胜利后不能再操作
            return;
        }

        // 触摸结束
        // 确定最终位置，定在整数点
        console.log("touch end");
        console.log("end id:" + this.blockID);
        console.log(this.node.position.x + " " + this.node.position.y);
        this.adjustLocation();

        // 更新状态
        if(this.lock == 0)
        {
            this.updateState();
            if(this.step != 0)
            window["steps"]++;
        }
        
        this.lock = 1;
        console.log(window["total_state"]);

        if(window["total_state"][2][5] == 2)
        {
            window["confetti"] = 1; // 控制播放彩纸屑动画

            // 步数
            console.log("steps:" + window["steps"]);
            // 从文件中读取最佳步数，评价星级

            window["id"] = (window["id"] + 1) % 4800;

            // 播放主滑块移出动画
            if (this.VictoryAnim) {
                this.VictoryAnim.play('victory_slide_out');

                const onAnimationFinished = (type: string, state: AnimationState) => {
                    if (state.name === 'victory_slide_out') {
                        //console.log(`动画 "${animName}" 播放完成`);
                        this.VictoryAnim.off(Animation.EventType.FINISHED, onAnimationFinished); // 移除监听
                        //this.nextStep(); // 执行下一步操作
                        window["victory"] = 1;
                    }
                };
                this.VictoryAnim.on(Animation.EventType.FINISHED, onAnimationFinished);
            }
            
            // 分别管理各关卡包进度
            if(window["id"] > window["game_process"][0] && window["id"] <= 1000)
            {
                // starter
                window["game_process"][0] = window["id"];
                sys.localStorage.setItem('starter_process', window["game_process"][0]);
            }

            else if(window["id"] > window["game_process"][1] + 1000 && window["id"] <= 2000)
            {
                // beginner
                window["game_process"][1] = window["id"] - 1000;
                sys.localStorage.setItem('beginner_process', window["game_process"][1]);
            }

            else if(window["id"] > window["game_process"][2] + 2000 && window["id"] <= 3000)
            {
                // intermediate
                window["game_process"][2] = window["id"] - 2000;
                sys.localStorage.setItem('intermediate_process', window["game_process"][2]);
            }

            else if(window["id"] > window["game_process"][3] + 3000 && window["id"] <= 4000)
            {
                // advanced
                window["game_process"][3] = window["id"] - 3000;
                sys.localStorage.setItem('advanced_process', window["game_process"][3]);
            }

            else if(window["id"] > window["game_process"][4] + 4000 && window["id"] <= 4800)
            {
                // expert
                window["game_process"][4] = window["id"] - 4000;
                sys.localStorage.setItem('expert_process', window["game_process"][4]);
            }
        }
    }

    getBlockType() {
        const prefabName: string = this.node.name;
        if(prefabName === "RowBlock2") this.blockType = 1; // 横2
        else if(prefabName === "ColBlock2") this.blockType = 2; // 竖2
        else if(prefabName === "RowBlock3") this.blockType = 3; // 横3
        else if(prefabName === "ColBlock3") this.blockType = 4; // 竖3
        else if(prefabName === "MainBlock") this.blockType = 5; // 主块
        else this.blockType = 0;
        //GameManager.generate();
    }

    getBlockID(x: number, y: number) {
        let res = -1;
        let i = 0;
        for(i = 0; i < window["blocks"].length; i++) {
            if(x == window["abs_coords"][i][0] && y == window["abs_coords"][i][1])
            {
                return i;
            }
        }
        return res;
    }

    getMaxStep(id: number) {
        if(id == -1)
            return;
        let i = 0;
        this.max_right = 0;
        this.max_left = 0;
        this.max_up = 0;
        this.max_down = 0;
        if(this.blockType == 1 || this.blockType == 3 || this.blockType == 5)
        {
            let x_start = window["block_state"][id][2];
            let x_end = window["block_state"][id][3];
            let y = window["block_state"][id][1];
            // 计算max_right
            for(i = x_end + 1; i <= 6; i++)
            {
                if(i <= 5 && window["total_state"][y][i] == 0)
                    this.max_right++;
                else if(i <= 5 && window["total_state"][y][i] != 0)
                    break;
            }
            for(i = x_start - 1; i >= -1; i--)
            {
                if(i >= 0 && window["total_state"][y][i] == 0)
                    this.max_left++;
                else if(i >= 0 && window["total_state"][y][i] != 0)
                    break;
            }
        }
        if(this.blockType == 2 || this.blockType == 4)
        {
            let y_start = window["block_state"][id][2];
            let y_end = window["block_state"][id][3];
            let x = window["block_state"][id][1];
            // 计算max_right
            for(i = y_end + 1; i <= 6; i++)
            {
                if(i <= 5 && window["total_state"][i][x] == 0)
                    this.max_down++;
                else if(i <= 5 && window["total_state"][i][x] != 0)
                    break;
            }
            for(i = y_start - 1; i >= -1; i--)
            {
                if(i >=0 && window["total_state"][i][x] == 0)
                    this.max_up++;
                else if(i >=0 && window["total_state"][i][x] != 0)
                    break;
            }
        }
    }

    adjustLocation() {
        let touchEnd_x = this.node.position.x;
        let touchEnd_y = this.node.position.y; 
        let final_move = 0;
        if(this.blockType == 1 || this.blockType == 3 || this.blockType == 5)
        {
            if(touchEnd_x >= this.begin_x) // right
            {
                final_move = Math.floor(((touchEnd_x - this.begin_x) + BLOCK_SIZE / 2) / BLOCK_SIZE);
                //console.log(final_move);
                this.node.setPosition(this.begin_x + final_move * BLOCK_SIZE, touchEnd_y);
                this.step = final_move;
            }
            else // left
            {
                final_move = Math.floor(((this.begin_x - touchEnd_x) + BLOCK_SIZE / 2) / BLOCK_SIZE);
                this.node.setPosition(this.begin_x - final_move * BLOCK_SIZE, touchEnd_y);
                this.step = -1 * final_move;
            }

        }
        if(this.blockType == 2 || this.blockType == 4)
        {
            if(touchEnd_y >= this.begin_y) // up
            {
                final_move = Math.floor(((touchEnd_y - this.begin_y) + BLOCK_SIZE / 2) / BLOCK_SIZE);
                //console.log(final_move);
                this.node.setPosition(touchEnd_x, this.begin_y + final_move * BLOCK_SIZE);
                this.step = -1 * final_move;
            }
            else // down
            {
                final_move = Math.floor(((this.begin_y - touchEnd_y) + BLOCK_SIZE / 2) / BLOCK_SIZE);
                //console.log(final_move);
                this.node.setPosition(touchEnd_x, this.begin_y - final_move * BLOCK_SIZE);
                this.step = final_move;
            }
        }
    }
    updateState() {
        let id = this.blockID;
        if(id == -1)
            return;
        if(window["blocks"][id][3] == 0)
        {
            // 横向，加在x上
            window["blocks"][id][0] += this.step;
        }
        else
        {
            // 纵向，加在y上
            window["blocks"][id][1] += this.step;
        }
        let dir = window["blocks"][id][3];
        let len = window["blocks"][id][2];
        window["block_state"][id][0] = dir; // 方向 0:横 1:竖
        window["block_state"][id][1] = window["blocks"][id][1-dir]; // 不动方向的坐标 横:y 竖:x （横块y不动，竖块x不动）
        window["block_state"][id][2] = window["blocks"][id][dir]; // 可动方向的坐标（范围）
        window["block_state"][id][3] = window["blocks"][id][dir] + len - 1;
        console.log(id + ":" + window["blocks"][id]);
        let i = 0;
        let j = 0;
        for(i = 0; i <= 5; i++)
        {
            for(j = 0; j <= 5; j++)
            {
                window["total_state"][i][j] = 0;
            }
        }
        //console.log(id + ":" + window["blocks"][id]);
        for(i = 0; i < window["blocks"].length; i++) {
            // 更新total_state, abs_coords
            let x = window["blocks"][i][0];
            let y = window["blocks"][i][1];
            len = window["blocks"][i][2];
            dir = window["blocks"][i][3];

            let abs_x = 0;
            let abs_y = 0;

            if(i == 0) {
                abs_x = BLOCK_SIZE * x + LEFT_BORDER;
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER;

                window["total_state"][y][x] = 2;
                window["total_state"][y][x + 1] = 2;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 2 && dir == 0) // 横2
            {
                abs_x = BLOCK_SIZE * x + LEFT_BORDER;
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER;

                window["total_state"][y][x] = 1;
                window["total_state"][y][x + 1] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 2 && dir == 1) // 竖2
            {
                abs_x = BLOCK_SIZE * x + LEFT_BORDER - (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER - (BLOCK_SIZE / 2);

                window["total_state"][y][x] = 1;
                window["total_state"][y + 1][x] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 3 && dir == 0) // 横3
            {
                abs_x = BLOCK_SIZE * x + LEFT_BORDER + (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER;

                window["total_state"][y][x] = 1;
                window["total_state"][y][x + 1] = 1;
                window["total_state"][y][x + 2] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 3 && dir == 1) // 竖3
            {
                abs_x = BLOCK_SIZE * x + LEFT_BORDER - (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER - BLOCK_SIZE;

                window["total_state"][y][x] = 1;
                window["total_state"][y + 1][x] = 1;
                window["total_state"][y + 2][x] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
        }
    }
    startPos: Vec2 = null;
}
