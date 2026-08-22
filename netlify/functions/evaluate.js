exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Only POST requests are allowed."
      })
    };
  }

  try {
    const data = JSON.parse(event.body);

    const response = data.response;

    if (!response) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "No AI response was provided."
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Evalix received the response!",
        response: response
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Something went wrong."
      })
    };
  }
};
