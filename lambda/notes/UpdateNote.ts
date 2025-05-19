const HANDLER_NAME = 'UpdateNote';

export const handler = async () => {
  return {
    statusCode: 200,
    body: `Hello World from ${HANDLER_NAME}`,
  };
};
