import { useQueryClient } from "@tanstack/react-query";
import {
  useListPhotos,
  useUploadPhoto,
  useDeletePhoto,
  getListPhotosQueryKey,
  getGetPhotoFileUrl
} from "@workspace/api-client-react";

// Wrap generated hooks to provide cache invalidation

export function useGalleryPhotos() {
  return useListPhotos();
}

export function useUploadGalleryPhoto() {
  const queryClient = useQueryClient();
  
  return useUploadPhoto({
    mutation: {
      onSuccess: () => {
        // Invalidate the list photos query to refresh the grid
        queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey() });
      },
    }
  });
}

export function useDeleteGalleryPhoto() {
  const queryClient = useQueryClient();
  
  return useDeletePhoto({
    mutation: {
      onSuccess: () => {
        // Invalidate the list photos query to refresh the grid
        queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey() });
      },
    }
  });
}

export { getGetPhotoFileUrl };
