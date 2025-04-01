import { _decorator, Component, Node, Vec3, tween, randomRange, UITransform, UIOpacity, Prefab, Script, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ConfettiController')
export class ConfettiController extends Component {
    @property(Node)
    confettiNodes: Node[] = []; // 彩纸屑节点数组

    start() {
        this.startConfettiAnimation();
    }

    startConfettiAnimation() {
        const parentUI = this.node.getComponent(UITransform)!;
        const parentHeight = parentUI.height;

        for (const confetti of this.confettiNodes) {
            this.animateConfetti(confetti, parentHeight);
        }
    }

    animateConfetti(confetti: Node, parentHeight: number) {
        // 随机初始位置
        const startX = randomRange(-800, 800);
        const startY = randomRange(parentHeight / 2 - 800, parentHeight / 2 - 600);
        //console.log('startY:', startY);
        confetti.setPosition(startX, startY, 0);

        // 目标位置
        const endX = startX + randomRange(-500, 500);
        const endY = -800; // 落到屏幕中间

        // 随机旋转速度
        const rotateSpeed = randomRange(30, 100);
        const duration = randomRange(2, 4); // 下降时间

        // 下降动画
        tween(confetti)
            .to(duration, { position: new Vec3(endX, endY, 0) })
            .call(() => {
                //confetti.active = false; // 动画结束后隐藏彩纸屑
                this.animateConfetti(confetti, parentHeight) // 循环动画
            })
            .start();

        // 旋转动画
        tween(confetti)
            .by(0.1, { angle: rotateSpeed })
            .repeatForever()
            //.repeat(duration / 0.1) // 旋转的次数，确保与下降时间匹配
            .start();
    }
}
