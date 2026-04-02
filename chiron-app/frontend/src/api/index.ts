import config from "../config";

export type HtmlMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function APIRequest(method: HtmlMethod, url: string, data?: any) {
  // build the options
  const options: RequestInit = {
    method,
    credentials: "include",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
  };
  // append on the data if needed
  if (["POST", "PATCH", "PUT"].includes(method)) {
    options["body"] = JSON.stringify(data);
  }

  const state = history.state || {};

  // make the request and return the data or response
  try {
    const response = await fetch(`${config.apiBaseUrl}${url}`, options);
    //simple case for if you are suddenly logged out
    if (response.status == 401) {
      window.location.reload();
    }
    if (response.status === 200) {
      const data = await response.json();

      if (data) {
        // return the actual data
        return data;
      }
    } else if (response.status < 400) {
      // return the response
      return response;
    } else {
      const data = await response.json();

      if (
        !["/me", "/logout"].includes(url) &&
        data?.Message === "UnauthorizedError: Signature has expired"
      ) {
        // check for auth errors and reload
        window.location.reload();
      }
      throw Error(data.detail);
    }
  } catch (e: any) {
    // if the error is thrown by the fetch call itself, then could be because you logged out in a separate window
    // reloading the page will reset and redirect to the set login page.
    // however, this also matches all other fetch errors, so to prevent infinite reloads we retry the call twice
    if (e.name == "TypeError" && e.message == "Failed to fetch") {
      let reloadCount = state.reloadCount || 0;
      if (reloadCount < 3) {
        state.reloadCount = ++reloadCount;
        history.replaceState(state, "", document.URL);
        window.location.reload();
      } else {
        console.error(
          "The page was reloaded 3 times and failed, there may be a connection issue"
        );
        console.log(history.state);
        delete state.reloadCount;
        throw e;
      }
    }
    delete state.reloadCount;
    throw e;
  }
}
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function APIFileRequest(
  method: HtmlMethod,
  url: string,
  filename: string,
  data?: any
) {
  // build the options
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "text/csv",
    },
  };

  // append on the data if needed
  if (["POST", "PATCH", "PUT"].includes(method)) {
    options["body"] = JSON.stringify(data);
  }
  const state = history.state || {};
  try {
    // make the request and return the data or response
    const response = await fetch(`${config.apiBaseUrl}${url}`, options);

    //simple case for if you are suddenly logged out
    if (response.status == 401) {
      window.location.reload();
    }
    if (response.status === 200) {
      const data = await response.text();

      if (data) {
        const newUrl = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement("a");
        link.href = newUrl;
        link.setAttribute("download", filename); //or any other extension
        document.body.appendChild(link);
        link.click();
      }
    } else if (response.status < 400) {
      // return the response
      return response;
    } else {
      const data = await response.json();
      // check for auth errors and reload
      if (
        !["/me", "/logout"].includes(url) &&
        data?.Message === "UnauthorizedError: Signature has expired"
      ) {
        window.location.reload();
      }

      throw Error(data.detail);
    }
  } catch (e: any) {
    // if the error is thrown by the fetch call itself, then could be because you logged out in a separate window
    // reloading the page will reset and redirect to the set login page.
    // however, this also matches all other fetch errors, so to prevent infinite reloads we retry the call twice
    if (e.name == "TypeError" && e.message == "Failed to fetch") {
      let reloadCount = state.reloadCount || 0;
      if (reloadCount < 3) {
        state.reloadCount = ++reloadCount;
        history.replaceState(state, "", document.URL);
        window.location.reload();
      } else {
        console.error(
          "The page was reloaded 3 times and failed, there may be a connection issue"
        );
        console.log(history.state);
        delete state.reloadCount;
        throw e;
      }
    }
    delete state.reloadCount;
    throw e;
  }
}
