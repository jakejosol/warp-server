import Warp from '../index';
import { RunOptionsType } from '../types/functions';

export default class FunctionController {

    api: Warp;

    constructor(api: Warp) {
        this.api = api;
    }
    
    async run({ user, functionName, keys = {} }: RunOptionsType): Promise<any> {
        // Get function
        const functionType = this.api.functions.get(functionName);

        // Run the function
        const result = await this.api.functions.run(functionType, keys, { user: user || undefined });

        // Return the result
        return result;
    }
}