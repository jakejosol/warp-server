// @flow
import WarpServer from '../index';
import User from '../classes/user';
import Session from '../classes/session';
import ModelCollection from '../utils/model-collection';
import { Defaults } from '../utils/constants';
import ConstraintMap from '../utils/constraint-map';
import Error from '../utils/error';
import type { 
    GetOptionsType, 
    FindOptionsType, 
    CreateOptionsType, 
    UpdateOptionsType,
    DestroyOptionsType,
    LoginOptionsType,
    MeOptionsType,
    LogoutOptionsType
} from '../types/users';

export default class UserController {

    _api: WarpServer;

    constructor(api: WarpServer) {
        this._api = api;
    }

    async find({ select, include, where, sort, skip, limit }: FindOptionsType): Promise<ModelCollection<User.Class>> {
        // Parse subqueries
        where = this._api.parseSubqueries(where);
    
        // Prepare query
        const query = {
            select,
            include,
            where: new ConstraintMap(where),
            sort: sort || Defaults.Query.Sort,
            skip: skip || Defaults.Query.Skip,
            limit: limit || Defaults.Query.Limit
        };
    
        // Get model
        const modelClass = this._api.auth.user();
    
        // Find matching objects
        const modelCollection = await modelClass.find(query);
    
        // Return collection
        return modelCollection;
    }
    
    async get({ id, select, include }: GetOptionsType): Promise<User.Class> {    
        // Prepare query
        const query = {
            select: select || [],
            include: include || [],
            id
        };
    
        // Get model
        const modelClass = this._api.auth.user();
    
        // Find matching object
        const model = await modelClass.getById(query);
    
        // Check if model is found
        if(typeof model === 'undefined')
            throw new Error(Error.Code.ForbdiddenOperation, `User with id \`${id}\` not found`);
    
        // Return the model
        return model;
    }
    
    async create({ Warp, metadata, currentUser, keys }: CreateOptionsType): Promise<User.Class> {
        // Check if session token is provided
        if(typeof currentUser !== 'undefined')
            throw new Error(Error.Code.ForbdiddenOperation, 'Users cannot be created using an active session. Please log out.');
    
        // Get model
        const modelClass = this._api.auth.user();
        const model = new modelClass({ metadata, currentUser, keys });

        // Bind Warp
        model.bindSDK(Warp);
    
        // Save the object
        await model.save();
    
        // Return the model
        return model;
    }
    
    async update({ Warp, metadata, currentUser, keys, id }: UpdateOptionsType): Promise<User.Class> {
        // Check if the editor is the same user
        if(!metadata.isMaster && (typeof currentUser === 'undefined' || currentUser.id !== id))
            throw new Error(Error.Code.ForbdiddenOperation, 'User details can only be edited by their owner or via master');
    
        // Get model
        const modelClass = this._api.auth.user();
        const model = new modelClass({ metadata, currentUser, keys, id });
    
        // Bind Warp
        model.bindSDK(Warp);

        // Save the object
        await model.save();
    
        // Return the model
        return model;
    }
    
    async destroy({ Warp, metadata, currentUser, id }: DestroyOptionsType): Promise<User.Class> {
        // Check if the destroyer is the same user
        if(!metadata.isMaster && (typeof currentUser === 'undefined' || currentUser.id !== id))
            throw new Error(Error.Code.ForbdiddenOperation, 'User details can only be destroyed by their owner or via master');
    
        // Get model
        const modelClass = this._api.auth.user();
        const model = new modelClass({ metadata, currentUser, id });
    
        // Bind Warp
        model.bindSDK(Warp);

        // Destroy the object
        await model.destroy();
    
        // Return the model
        return model;
    }
    
    async logIn({ Warp, metadata, currentUser, username, email, password }: LoginOptionsType): Promise<User.Class> {
        // Get session class
        const sessionClass = this._api.auth.session();
    
        // Check if session token is provided
        if(typeof currentUser !== 'undefined')
            throw new Error(Error.Code.ForbdiddenOperation, 'Cannot log in using an active session. Please log out.');
    
        // Authenticate the user
        const user = await this._api.authenticate({ username, email, password });
    
        // If no user found
        if(!(user instanceof this._api.auth.user()))
            throw new Error(Error.Code.InvalidCredentials, 'Invalid username/password');
    
        // If the user is found, create a new session
        const keys = {
            [sessionClass.userKey]: user.toPointer().toJSON(),
            [sessionClass.originKey]: metadata.client,
            [sessionClass.sessionTokenKey]: this._api.createSessionToken(user),
            [sessionClass.revokedAtKey]: this._api.getRevocationDate()
        };
    
        const session = new sessionClass({ metadata, keys });

        // Bind Warp
        session.bindSDK(Warp);
    
        // Save the new session
        await session.save();
    
        // Return the session
        return session;
    }
    
    async me({ currentUser }: MeOptionsType): Promise<User.Class> {
        // Check if currentUser exists
        if(typeof currentUser === 'undefined')
            throw new Error(Error.Code.InvalidSessionToken, 'Session does not exist');
        
        // Return the current user
        return currentUser;
    }
    
    async logOut({ Warp, sessionToken }: LogoutOptionsType): Promise<Session.Class> {
        // Get session class
        const sessionClass = this._api.auth.session();
    
        // Find provided session
        const session = await sessionClass.getFromToken(sessionToken);
    
        if(typeof session === 'undefined')
            throw new Error(Error.Code.InvalidSessionToken, 'Session does not exist');
    
        // Bind Warp
        session.bindSDK(Warp);

        // Destroy the session
        await session.destroy();
    
        // Return the session
        return session;
    }
}