import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import { Draft, produce } from "immer";
import { ActionURL } from '@labkey/api';
import { ConfirmModal, createWebDavDirectory, deleteWebDavResource, LoadingSpinner } from '@labkey/components';

import { MY_ATTACHMENTS_DIR } from "./constants";
import { FileAttachmentModel, SavedFileModel } from "./models";
import { getUploadedFiles } from "./actions";
import { CreateDirectoryModal } from './CreateDirectoryModal';

export const FileDisplayPanel : FC = memo(() => {
    const [loading, setLoading] = useState<boolean>(true);
    const [showCreateDirectoryModal, setShowCreateDirectoryModal] = useState<boolean>();
    const [selectedDeleteResource, setSelectedDeleteResource] = useState<string>();
    const [fileAttachmentModel, setFileAttachmentModel] = useState<FileAttachmentModel>(new FileAttachmentModel());

    //equivalent to componentDidMount and componentDidUpdate
    useEffect(() => {
        if (!loading) return;

        getUploadedFiles(ActionURL.getContainer(), MY_ATTACHMENTS_DIR, true)
            .then((files:Array<SavedFileModel>) => {
                if (files?.length > 0) {
                    const updatedModel = produce(fileAttachmentModel, (draft: Draft<FileAttachmentModel>) => {
                        draft['savedFiles'] = files;
                    });
                    setFileAttachmentModel(updatedModel);
                }
                else {
                    setFileAttachmentModel(new FileAttachmentModel());
                }

                setLoading(false);
            });
    }, [loading]);

    const onCreateDirectory = useCallback(() => {
        setShowCreateDirectoryModal(true);
    }, []);

    const closeCreateDirectory = useCallback(() => {
        setShowCreateDirectoryModal(false);
    }, []);

    const submitCreateDirectory = useCallback((name: string) => {
        let path = MY_ATTACHMENTS_DIR;
        if (!name?.startsWith('/')) path = path + '/';
        path = path + name;

        // Note: containerPath param can be the path (i.e. '/MyProject') or the container GUID
        createWebDavDirectory(ActionURL.getContainer(), path, true)
            .then(() => {
                // reset loading state to force refresh of panel savedFiles
                setLoading(true);
            });

        closeCreateDirectory();
    }, [closeCreateDirectory, createWebDavDirectory]);

    const onDeleteResource = useCallback((resourceName: string) => {
        let path = MY_ATTACHMENTS_DIR;
        if (!resourceName?.startsWith('/')) path = path + '/';
        path = path + resourceName;

        setSelectedDeleteResource(path);
    }, []);

    const onCancelDeleteResource = useCallback(() => {
        setSelectedDeleteResource(undefined);
    }, []);

    const onConfirmDeleteResource = useCallback(() => {
        deleteWebDavResource(ActionURL.getContainer(), selectedDeleteResource)
            .then(() => {
                // reset loading state to force refresh of panel savedFiles
                setLoading(true);
                setSelectedDeleteResource(undefined);
            });
    }, [deleteWebDavResource, selectedDeleteResource]);

    return (
        <div className='panel panel-default'>
            <div className='panel-heading'>
                My Uploaded Attachments
            </div>
            <div className='panel-body'>
                {loading && <LoadingSpinner />}
                {
                    !loading && fileAttachmentModel.savedFiles?.length > 0 && (
                        <ul>
                            {
                                fileAttachmentModel?.savedFiles?.map((savedFile) => (
                                    <li key={savedFile.fileName}>
                                        <a href={savedFile.href} target='_blank'>{savedFile.fileName}</a>
                                        <a
                                            className="labkey-text-link"
                                            style={{ paddingLeft: '10px' }}
                                            onClick={() => onDeleteResource(savedFile.fileName)}
                                        >
                                            Delete
                                        </a>
                                    </li>
                                ))
                            }
                        </ul>
                    )
                }
                {
                    !loading && !fileAttachmentModel.savedFiles && (
                        <p>
                            No files or directories to display. Use the panel above to upload files to this location.
                        </p>
                    )
                }
                {!loading && (
                    <p>
                        <a className='labkey-text-link' href={ActionURL.buildURL('filecontent', 'begin', undefined, {
                            path: MY_ATTACHMENTS_DIR
                        })}>
                            Manage Files
                        </a>
                        <a className='labkey-text-link' onClick={onCreateDirectory}>
                            Create Directory
                        </a>
                    </p>
                )}
                {showCreateDirectoryModal && <CreateDirectoryModal close={closeCreateDirectory} submit={submitCreateDirectory} />}
                {selectedDeleteResource && (
                    <ConfirmModal onConfirm={onConfirmDeleteResource} onCancel={onCancelDeleteResource} show title="Delete Resource?">
                        <p>Are you sure you want to delete the selected resource?</p>
                        <p><b>{selectedDeleteResource}</b></p>
                    </ConfirmModal>
                )}
            </div>
        </div>
    );
})
