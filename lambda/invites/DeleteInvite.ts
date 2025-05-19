const HANDLER_NAME = 'DeleteInvite';

export const handler = async () => {
  return {
    statusCode: 200,
    body: `Hello World from ${HANDLER_NAME}`,
  };
};
