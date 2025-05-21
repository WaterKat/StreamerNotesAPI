import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { join as path_join } from 'path';
import { CognitoUserPoolsAuthorizer, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { get } from 'http';

export class StreamerNotesLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // MARK: DynamoDB
    const notes_table = new dynamodb.Table(this, 'NotesTable', {
      tableName: 'Notes',
      partitionKey: { name: 'UserId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'NoteId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    const groups_table = new dynamodb.Table(this, 'GroupsTable', {
      tableName: 'Groups',
      partitionKey: { name: 'GroupId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    const invites_table = new dynamodb.Table(this, 'InvitesTable', {
      tableName: 'Invites',
      partitionKey: { name: 'UserId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GroupId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    const group_note_cache = new dynamodb.Table(this, 'GroupNoteCacheTable', {
      tableName: 'GroupNoteCache',
      partitionKey: { name: 'GroupId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'NoteId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    })


    // MARK: Lambda
    const makeLambda = (name: string, path: string = '') => {
      const func = new lambda.Function(this, `${name}Handler`, {
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: `${name}.handler`,
        code: lambda.Code.fromAsset(path_join(__dirname, '../lambda', path)),
      });
      func.addEnvironment('HANDLER_NAME', name);
      return func;
    }

    const health_check = makeLambda('HealthCheck', 'health');

    const create_note = makeLambda('CreateNote', 'notes');
    const get_notes = makeLambda('GetNotes', 'notes');
    const update_note = makeLambda('UpdateNote', 'notes');
    const delete_note = makeLambda('DeleteNote', 'notes');

    const create_group = makeLambda('CreateGroup', 'groups');
    const get_groups = makeLambda('GetGroups', 'groups');
    const update_group = makeLambda('UpdateGroup', 'groups');
    const delete_group = makeLambda('DeleteGroup', 'groups');

    const create_invite = makeLambda('CreateInvite', 'invites');
    const get_invites = makeLambda('GetInvites', 'invites');
    const update_invite = makeLambda('UpdateInvite', 'invites');
    const delete_invite = makeLambda('DeleteInvite', 'invites');

    create_note.addEnvironment('NOTES_TABLE', notes_table.tableName);
    get_notes.addEnvironment('NOTES_TABLE', notes_table.tableName);
    update_note.addEnvironment('NOTES_TABLE', notes_table.tableName);
    delete_note.addEnvironment('NOTES_TABLE', notes_table.tableName);

    create_group.addEnvironment('GROUPS_TABLE', groups_table.tableName);
    get_groups.addEnvironment('GROUPS_TABLE', groups_table.tableName);
    update_group.addEnvironment('GROUPS_TABLE', groups_table.tableName);
    delete_group.addEnvironment('GROUPS_TABLE', groups_table.tableName);

    create_invite.addEnvironment('INVITES_TABLE', invites_table.tableName);
    get_invites.addEnvironment('INVITES_TABLE', invites_table.tableName);
    update_invite.addEnvironment('INVITES_TABLE', invites_table.tableName);
    delete_invite.addEnvironment('INVITES_TABLE', invites_table.tableName);

    notes_table.grantReadWriteData(create_note);
    notes_table.grantReadWriteData(get_notes);
    notes_table.grantReadWriteData(update_note);
    notes_table.grantReadWriteData(delete_note);

    groups_table.grantReadWriteData(create_group);
    groups_table.grantReadWriteData(get_groups);
    groups_table.grantReadWriteData(update_group);
    groups_table.grantReadWriteData(delete_group);

    invites_table.grantReadWriteData(create_invite);
    invites_table.grantReadWriteData(get_invites);
    invites_table.grantReadWriteData(update_invite);
    invites_table.grantReadWriteData(delete_invite);


    // MARK: Cognito
    const user_pool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true
      },
      autoVerify: {
        email: true
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      }
    });

    const user_pool_client = new cognito.UserPoolClient(this, 'StreamerNotesUserPoolClient', {
      userPool: user_pool,
      authFlows: {
        userPassword: true,
        userSrp: true
      }
    });

    const authorizer = new CognitoUserPoolsAuthorizer(this, 'StreamerNotesAuthorizer', {
      cognitoUserPools: [user_pool]
    })


    // MARK: API
    const api = new RestApi(this, 'StreamerNotesServiceApi', {
      restApiName: 'StreamerNotesServiceApi',
      description: 'Handles CRUD operations for StreamerNotes',
    });

    const addAuthenticatedMethod = (resource: apigateway.IResource, method: string, lambda: lambda.Function) => {
      resource.addMethod(method, new LambdaIntegration(lambda), {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
    };

    const health = api.root.addResource('health');
    health.addMethod('GET', new LambdaIntegration(health_check));

    const notes = api.root.addResource('notes');
    addAuthenticatedMethod(notes, 'POST', create_note);
    addAuthenticatedMethod(notes, 'GET', get_notes);
    addAuthenticatedMethod(notes.addResource('{NoteId}'), 'GET', get_notes);
    addAuthenticatedMethod(notes, 'PATCH', update_note);
    addAuthenticatedMethod(notes, 'DELETE', delete_note);

    const groups = api.root.addResource('groups');
    addAuthenticatedMethod(groups, 'POST', create_group);
    addAuthenticatedMethod(groups, 'GET', get_groups);
    addAuthenticatedMethod(groups, 'PATCH', update_group);
    addAuthenticatedMethod(groups, 'DELETE', delete_group);

    const invites = api.root.addResource('invites');
    addAuthenticatedMethod(invites, 'POST', create_invite);
    addAuthenticatedMethod(invites, 'GET', get_invites);
    addAuthenticatedMethod(invites, 'PATCH', update_invite);
    addAuthenticatedMethod(invites, 'DELETE', delete_invite);
  }
}
