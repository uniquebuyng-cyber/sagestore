import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../../api/axios';
import { Store, MapPin, Users, ArrowLeft } from 'lucide-react';

export default function OutletDetail() {
  const { id } = useParams();
  const [outlet, setOutlet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/outlets/${id}`).then(r => setOutlet(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  if (!outlet) return <p className="text-gray-500 text-center py-20">Outlet not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/outlets" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></Link>
        <h2 className="text-xl font-bold text-gray-900">{outlet.name}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><Store size={24} className="text-blue-600" /></div>
            <div><h3 className="font-semibold text-gray-900">{outlet.name}</h3><p className="text-xs text-gray-500">Branch Info</p></div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 text-gray-600"><MapPin size={14} className="mt-0.5 shrink-0" /><span>{outlet.address}</span></div>
            {outlet.phone && <p className="text-gray-600">Phone: {outlet.phone}</p>}
            {outlet.manager && <p className="text-gray-600">Manager: <span className="font-medium">{outlet.manager.name}</span></p>}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-gray-500" />
            <h3 className="font-semibold text-gray-900">Workers ({outlet.workers?.length || 0})</h3>
          </div>
          {outlet.workers?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No workers assigned to this outlet</p>
          ) : (
            <div className="space-y-2">
              {outlet.workers?.map(w => (
                <div key={w._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{w.name.charAt(0)}</div>
                    <div><p className="text-sm font-medium text-gray-800">{w.name}</p><p className="text-xs text-gray-500">{w.email}</p></div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{w.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
