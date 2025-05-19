const HANDLER_NAME = 'GetGroups';

export const handler = async () => {
  return {
    statusCode: 200,
    body: `Hello World from ${HANDLER_NAME}`,
  };
};
