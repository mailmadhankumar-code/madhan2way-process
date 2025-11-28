
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from '@/lib/types';

interface InfoPopupProps {
    db: Database;
    onClose: () => void;
}

export default function InfoPopup({ db, onClose }: InfoPopupProps) {
    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{db.name} - Info</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="db">
                    <TabsList>
                        <TabsTrigger value="db">DB</TabsTrigger>
                        <TabsTrigger value="os">OS</TabsTrigger>
                    </TabsList>
                    <TabsContent value="db">
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>DB Version</p>
                                <p>{db.dbVersion || 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>DB Patch Details</p>
                                <p>{db.dbPatchDetails || 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>DB Size</p>
                                <p>{db.dbSize ? `${db.dbSize} GB` : 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>SGA Target</p>
                                <p>{db.sgaTarget ? `${db.sgaTarget} GB` : 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>PGA Target</p>
                                <p>{db.pgaTarget ? `${db.pgaTarget} GB` : 'N/A'}</p>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="os">
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>OS Platform</p>
                                <p>{db.osPlatform || 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>OS Version</p>
                                <p>{db.osVersion || 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>OS Patch Details</p>
                                <p>{db.osPatchDetails || 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>Total CPU</p>
                                <p>{db.totalCpu || 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <p>Total Memory</p>
                                <p>{db.totalMemory ? `${db.totalMemory} GB` : 'N/A'}</p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
