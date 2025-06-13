import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { Outlet, ScrollRestoration, useParams } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  LinearProgress,
  Typography,
} from "@mui/material";
import { useAppSelector, useAppDispatch } from "./store/hooks";
import { setCurrentUser } from "./store/authSlice";
import { grey } from "@mui/material/colors";
import InfoBanner from "./components/InfoBanner";
import { LicenseInfo } from "@mui/x-license";
import config from "./config";
import { useIdleTimer } from "react-idle-timer";
import finalConfig from "./config";
LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_KEY);

export type AllError = Error & { data: string; statusText: string };

export function ErrorDisplay({ error }: { error: AllError }) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.
  return (
    <>
      <Header />
      <Box role="alert" maxWidth={600} mx="auto" marginTop="15%">
        <Typography textAlign="center" variant="h4" gutterBottom>
          Something went wrong
        </Typography>

        <Box
          bgcolor={grey[100]}
          border="1px solid"
          borderColor={grey[300]}
          borderRadius={2}
          padding={2}
          maxHeight={200}
          overflow={"scroll"}
        >
          {import.meta.env.DEV ? (
            <>
              <Typography color="error">{error.message}</Typography>
              <Typography>{error.stack}</Typography>
              <Typography color="error">{error.statusText}</Typography>
              <Typography>{error.data}</Typography>
            </>
          ) : (
            <>
              <Typography color="error">Refused to fetch</Typography>
              <Typography>
                You may have been logged out, or the api may be experiencing
                issues
              </Typography>
            </>
          )}
        </Box>

        <Box alignItems={"center"} pt={2}>
          <Button
            variant="contained"
            component="button"
            onClick={() => {
              window.location.href = "/";
            }}
            sx={{ m: 2 }}
          >
            Go to home page
          </Button>
          <Button
            variant="contained"
            component="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload Page
          </Button>
        </Box>
      </Box>
      <Footer />
    </>
  );
}

function App() {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.authStatus);
  const authErrors = useAppSelector((state) => state.auth.errors);
  const dataset = useAppSelector((state) => state.auth.dataset);
  const { dataset_id } = useParams();
  if (authStatus == "idle") {
    dispatch(
      setCurrentUser({
        dataset_id: dataset_id,
        current_dataset: dataset,
      })
    );
  }

  const onIdle = () => {
    window.location.href = config.header.logoutLink;
  };
  useIdleTimer({ onIdle, timeout: finalConfig.idleTimeOut });

  return (
    <>
      <ErrorBoundary FallbackComponent={ErrorDisplay}>
        {import.meta.env.VITE_SHOW_INFO_BAR ? <InfoBanner /> : null}

        <Header />
        {authErrors?.length > 0 ? (
          authErrors.map((err) => {
            return (
              <Alert severity="error" key={err}>
                <AlertTitle>Error</AlertTitle>
                {err}
              </Alert>
            );
          })
        ) : (
          <Suspense fallback={<LinearProgress />}>
            <Box pb={config.footer.paddingForContent} mb={1}>
              <Outlet />
            </Box>
          </Suspense>
        )}
        <Footer />
      </ErrorBoundary>
      <ScrollRestoration />
    </>
  );
}

export default App;
