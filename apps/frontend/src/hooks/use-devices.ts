import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import { Device, PaginatedResponse } from "../types/api";

interface UseDevicesOptions {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const useDevices = ({
  page = 1,
  limit = 10,
  status,
  search,
}: UseDevicesOptions = {}) => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) queryParams.append("status", status);
  if (search) queryParams.append("search", search);

  const { data, isLoading, isError, error, refetch } = useQuery<
    PaginatedResponse<Device>,
    Error
  >({
    queryKey: ["devices", page, limit, status, search],
    queryFn: () =>
      api.get<PaginatedResponse<Device>>(
        `/device/status?${queryParams.toString()}`,
      ),
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  return { data, isLoading, isError, error, refetch };
};
