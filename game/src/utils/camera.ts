import { Game } from "../../../engine/Game";

export const enableCameraMovementWithArrowKeys = (game: Game, speed: number) => {
    game.input.remap('CameraUp', 'ArrowUp');
    game.input.remap('CameraDown', 'ArrowDown');
    game.input.remap('CameraLeft', 'ArrowLeft');
    game.input.remap('CameraRight', 'ArrowRight');
    game.registerLogic((deltaMs) => {
        const deltaSeconds = deltaMs / 1000;
        if (game.input.get('CameraUp').pressed) game.camera.moveRelative(0, -speed * deltaSeconds);
        if (game.input.get('CameraDown').pressed) game.camera.moveRelative(0, speed * deltaSeconds);
        if (game.input.get('CameraLeft').pressed) game.camera.moveRelative(-speed * deltaSeconds, 0);
        if (game.input.get('CameraRight').pressed) game.camera.moveRelative(speed * deltaSeconds, 0);
    });
};

export const centerCameraOnPawn = (game: Game, pawnName: string) => {
    game.registerLogic(() => {
        const hitBox = game.getPawn(pawnName).getHitBox();
        if (hitBox) game.camera.centerOn(hitBox);
    });
};