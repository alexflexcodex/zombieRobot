class Weapon {

    constructor(owner = null, typeOfWeapon, world) {

        this.weaponName = typeOfWeapon;
        this.RendererOJB = null;
        this.world = world;
        this.owner = owner;
        this.power = null;

    }

    init() {
        this.init3Dobject();
    }

    init3Dobject() {
        switch (this.weaponName) {
            case 'RayGun':
                console.log(`Creating ${this.weaponName}`);
                this.RendererOJB = this.world.assetManager.models.get('rayGun');
                this.power = 1000000;
                break;
            case 'Long Haul':
                console.log(`Creating ${this.weaponName}`);
                break;
            default:
                console.log(`Sorry, we are out of ${this.weaponName}.`);
        }
        this.world.camera.add(this.RendererOJB);
    }

}


export { Weapon };
